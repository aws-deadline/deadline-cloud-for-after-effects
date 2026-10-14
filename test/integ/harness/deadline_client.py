# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Submit a job bundle and poll it to a terminal state via the ``deadline`` CLI.

This is the render (E2E) half of the harness — the piece the internal harness lacked.
It re-uses the same ``deadline`` CLI the submitter itself shells out to, so nothing
about job submission is re-implemented.
"""

from __future__ import annotations

import json
import os
import re
import signal
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from . import config

# job wait exit codes -> terminal status (from `deadline job wait --help`)
_WAIT_EXIT_STATUS = {
    0: "SUCCEEDED",
    1: "TIMEOUT",
    2: "FAILED",
    3: "CANCELED",
    4: "SUSPENDED",
    5: "NOT_COMPATIBLE",
}

_JOB_ID_RE = re.compile(r"job-[0-9a-f]{32}")

# Substrings that mean "the poll itself failed" (auth/creds/network), NOT that the
# job reached a terminal state. Treated distinctly so an expired-credential poll is
# never mistaken for a genuine job TIMEOUT/FAILED (credentials last ~1h; a long run outlives them).
# Specific error names only. Matched across stdout+stderr, but only when stdout is
# not the CLI's job-status JSON — the CLI prints some errors to stdout, while the JSON
# itself can contain words like "expired" in a job name.
_POLL_ERROR_MARKERS = (
    "ExpiredToken",
    "CredentialRetrievalError",
    "TokenRetrievalError",
    "InvalidClientTokenId",
    "UnrecognizedClientException",
    "AccessDeniedException",
    "Unable to locate credentials",
    "The security token included in the request is expired",
    "Could not connect to the endpoint URL",
    "EndpointConnectionError",
)

# Task run states that end a task. Anything else in taskRunStatusCounts means the
# job is still in flight.
_TERMINAL_TASK_STATES = {
    "SUCCEEDED",
    "FAILED",
    "CANCELED",
    "SUSPENDED",
    "NOT_COMPATIBLE",
}


def terminal_status_from_counts(counts: dict[str, Any]) -> str | None:
    """The job's terminal status implied by ``taskRunStatusCounts``, or None.

    None when there are no tasks or any task is still in flight. Otherwise the
    worst outcome wins: one FAILED task fails the job.
    """
    active = {k for k, v in (counts or {}).items() if v}
    if not active or not active <= _TERMINAL_TASK_STATES:
        return None
    for state in ("FAILED", "CANCELED", "NOT_COMPATIBLE", "SUSPENDED"):
        if state in active:
            return state
    return "SUCCEEDED"


def redirect_output_dir(bundle_dir: Path, output_dir: Path) -> list[str]:
    """Point every step's render output at ``output_dir``, returning the old paths.

    The output location is not baked into the submission: the submitter emits it as a
    per-step job parameter (``_1_T19_emit_image__OutputDir``) and repeats it in
    ``asset_references.json``'s ``outputs.directories``. Rewriting both before submit
    is therefore enough to move where the farm writes — no ``.aep`` rebuild, no change
    to the asset builder's baked-in ``RENDERBASE``.

    Doing it this way fixes the retrieval problem at its source. ``deadline job
    download-output`` has no destination flag — it writes to whatever absolute path the
    job recorded — so rather than fight that, we make the recorded path one the harness
    chose. Two consequences fall out for free:

    * :func:`known_asset_paths` reads ``outputs.directories`` from this same patched
      file, so the new location is auto-allowlisted on submit and needs no farm- or
      machine-level config.
    * Renders stop landing inside ``aep_test_assets/``, which is the tree uploaded as
      job *input*.

    Must run **before** the ``bundle`` snapshot and before :func:`known_asset_paths`.
    The ``bundle-as-built`` snapshot is taken earlier, so assertions about what the
    submitter itself chose still see the original paths.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    target = str(output_dir)
    replaced: list[str] = []

    params_path = Path(bundle_dir) / "parameter_values.json"
    if params_path.exists():
        data = json.loads(params_path.read_text(encoding="utf-8"))
        for entry in data.get("parameterValues") or []:
            if isinstance(entry, dict) and str(entry.get("name", "")).endswith(
                "_OutputDir"
            ):
                replaced.append(str(entry.get("value")))
                entry["value"] = target
        params_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    refs_path = Path(bundle_dir) / "asset_references.json"
    if refs_path.exists():
        data = json.loads(refs_path.read_text(encoding="utf-8"))
        refs = data.get("assetReferences", data)
        outputs = refs.get("outputs")
        if isinstance(outputs, dict) and outputs.get("directories"):
            # One entry per step, commonly duplicated when steps share a directory;
            # collapse to the single target rather than repeating it per step.
            outputs["directories"] = [target]
        refs_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    return replaced


def apply_job_metadata(
    bundle_dir: Path,
    *,
    description: str | None = None,
    task_run_timeout_s: int | None = None,
) -> None:
    """Patch the bundle's OpenJD template in place before submit.

    The ``deadline bundle submit`` CLI can set neither the job description nor a
    task timeout, so we edit the template directly:

    * ``description`` -> the template's top-level ``description`` (surfaced as the
      job description in the Deadline Cloud Monitor console).
    * ``task_run_timeout_s`` -> ``steps[].script.actions.onRun.timeout`` for every
      step (seconds), bounding each task on the farm.

    No-op if the field is None or the template can't be found/parsed. Preserves the
    template's serialization format (JSON or YAML). Output redirection is a separate
    concern handled by :func:`redirect_output_dir`, which patches the *parameter
    values* and *asset references* rather than the template.
    """
    if description is None and task_run_timeout_s is None:
        return
    for ext in (".json", ".yaml", ".yml"):
        path = Path(bundle_dir) / f"template{ext}"
        if path.exists():
            break
    else:
        return

    is_json = ext == ".json"
    text = path.read_text(encoding="utf-8")
    if is_json:
        tmpl = json.loads(text)
    else:
        import yaml

        tmpl = yaml.safe_load(text)

    if description is not None:
        # OpenJD caps description length; keep it single-line and bounded.
        tmpl["description"] = description.replace("\n", " ").strip()[:2048]
    if task_run_timeout_s is not None:
        for step in tmpl.get("steps", []) or []:
            actions = (step.get("script") or {}).get("actions") or {}
            on_run = actions.get("onRun")
            if isinstance(on_run, dict):
                on_run["timeout"] = int(task_run_timeout_s)

    if is_json:
        path.write_text(json.dumps(tmpl, indent=2), encoding="utf-8")
    else:
        import yaml

        path.write_text(yaml.safe_dump(tmpl, sort_keys=False), encoding="utf-8")


def known_asset_paths(bundle_dir: Path) -> list[str]:
    """Directories the submit should treat as *known*, derived from the bundle.

    ``deadline bundle submit --yes`` cancels ("Job submission canceled ... there
    were unknown paths") when the job's inputs/outputs live outside any storage
    profile location or ``settings.known_asset_paths`` entry — since with
    ``auto_accept`` on there's no human to confirm the upload. Rather than pin a
    machine- or farm-level config, we read the bundle's own
    ``asset_references.json`` and hand those directories back as
    ``--known-asset-path`` on the submit itself.

    This stays correct wherever the test assets live: a different developer's
    checkout or a CI runner will produce a bundle referencing *their* paths, and
    we allowlist exactly those. File references collapse to their parent dir so a
    whole reference tree is covered without listing each file.
    """
    ref_file = Path(bundle_dir) / "asset_references.json"
    try:
        data = json.loads(ref_file.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []

    refs = data.get("assetReferences", data)  # tolerate nested or flat shapes
    inputs = refs.get("inputs", {}) or {}
    outputs = refs.get("outputs", {}) or {}

    dirs: set[str] = set()
    for f in inputs.get("filenames", []) or []:
        if f:
            dirs.add(str(Path(f).parent))
    for d in (inputs.get("directories", []) or []) + (
        outputs.get("directories", []) or []
    ):
        if d:
            dirs.add(str(Path(d)))
    for p in refs.get("referencedPaths", []) or []:
        if p:
            # A suffix implies a file; otherwise treat the entry as a directory.
            dirs.add(str(Path(p).parent if Path(p).suffix else Path(p)))

    return sorted(dirs)


class DeadlineError(RuntimeError):
    """A ``deadline`` CLI invocation failed in a way the caller must handle."""


@dataclass
class SubmitResult:
    job_id: str | None
    returncode: int
    stdout: str
    stderr: str

    @property
    def ok(self) -> bool:
        return self.returncode == 0 and self.job_id is not None


@dataclass
class WaitResult:
    returncode: int
    status: str  # SUCCEEDED / FAILED / CANCELED / SUSPENDED / TIMEOUT / NOT_COMPATIBLE / POLL_ERROR / UNKNOWN
    stdout: str
    stderr: str

    @property
    def succeeded(self) -> bool:
        return self.returncode == 0


# Upper bound for `deadline bundle submit`, which uploads job attachments. Override
# with AE_JOB_SUBMIT_TIMEOUT (seconds).
JOB_SUBMIT_TIMEOUT_S = int(os.environ.get("AE_JOB_SUBMIT_TIMEOUT", "900"))


def _kill_tree(proc: subprocess.Popen) -> None:
    """Kill ``proc`` and its children. Killing only the CLI process can leave a child
    holding the output pipes, so the call would still block until that child exits."""
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
            capture_output=True,
            check=False,
        )
    else:
        try:
            os.killpg(proc.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            proc.kill()


def _run(args: list[str], timeout: int | None = None) -> subprocess.CompletedProcess:
    # check=False semantics are load-bearing: `job wait`'s *exit code* is the job
    # outcome (see _WAIT_EXIT_STATUS), so a non-zero return is data, not an error.
    cmd = [config.get_deadline_cli(), *args]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=sys.platform != "win32",
    )
    try:
        out, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        _kill_tree(proc)
        out, err = proc.communicate()
        raise subprocess.TimeoutExpired(
            cmd, exc.timeout, output=out, stderr=err
        ) from exc
    return subprocess.CompletedProcess(cmd, proc.returncode, out, err)


def submit(
    bundle_dir: Path,
    *,
    name: str | None = None,
    priority: int | None = None,
    max_retries_per_task: int | None = None,
    add_known_asset_paths: bool = True,
    extra_args: list[str] | None = None,
) -> SubmitResult:
    """``deadline bundle submit <dir> --yes`` using the configured default farm/queue.

    Returns the parsed job id. Note ``bundle submit`` has no ``--output json``; the
    job id (``job-<32 hex>``) is parsed from stdout.

    By default the bundle's referenced directories are passed as
    ``--known-asset-path`` (see :func:`known_asset_paths`) so the non-interactive
    ``--yes`` submit doesn't cancel on "unknown paths". Pass
    ``add_known_asset_paths=False`` to exercise that guard (e.g. negative tests).
    """
    args = [
        "bundle",
        "submit",
        str(bundle_dir),
        "--yes",
        "--submitter-name",
        "After Effects",
    ]
    if name:
        args += ["--name", name]
    if priority is not None:
        args += ["--priority", str(priority)]
    if max_retries_per_task is not None:
        args += ["--max-retries-per-task", str(max_retries_per_task)]
    if add_known_asset_paths:
        for path in known_asset_paths(bundle_dir):
            args += ["--known-asset-path", path]
    if extra_args:
        args += extra_args

    # Bounded: a stalled job-attachments upload must not hang the whole suite.
    try:
        proc = _run(args, timeout=JOB_SUBMIT_TIMEOUT_S)
    except subprocess.TimeoutExpired as exc:
        return SubmitResult(
            job_id=None,
            returncode=1,
            stdout=exc.stdout if isinstance(exc.stdout, str) else "",
            stderr=f"bundle submit timed out after {JOB_SUBMIT_TIMEOUT_S}s",
        )
    match = _JOB_ID_RE.search(proc.stdout) or _JOB_ID_RE.search(proc.stderr)
    return SubmitResult(
        job_id=match.group(0) if match else None,
        returncode=proc.returncode,
        stdout=proc.stdout,
        stderr=proc.stderr,
    )


def cancel(job_id: str) -> bool:
    """Cancel a job's active tasks. True if the CLI accepted it; never raises.

    Used so a render that ends in an unexpected state does not leave a job running
    on the default farm.
    """
    try:
        proc = _run(
            ["job", "cancel", "--job-id", job_id, "--mark-as", "canceled", "--yes"],
            timeout=120,
        )
    except (subprocess.TimeoutExpired, OSError):
        return False
    return proc.returncode == 0


def wait(job_id: str, *, timeout: int | None = None) -> WaitResult:
    """``deadline job wait --job-id <id>`` — blocks to terminal; exit code = outcome."""
    args = ["job", "wait", "--job-id", job_id]
    if timeout is not None:
        args += ["--timeout", str(timeout)]
    # Give the subprocess headroom over the CLI's own --timeout so we read the exit code.
    proc_timeout = (timeout + 120) if timeout else None
    try:
        proc = _run(args, timeout=proc_timeout)
    except subprocess.TimeoutExpired as exc:
        return WaitResult(returncode=1, status="TIMEOUT", stdout="", stderr=str(exc))

    status = _WAIT_EXIT_STATUS.get(proc.returncode, "UNKNOWN")
    # A non-zero exit whose output smells of auth/credential/network trouble is a
    # *poll* failure, not a job outcome — surface it distinctly so the caller can
    # re-check the real farm state instead of recording a bogus TIMEOUT/FAILED.
    if proc.returncode != 0 and not _reports_job_status(proc.stdout):
        blob = f"{proc.stdout}\n{proc.stderr}"
        if any(marker in blob for marker in _POLL_ERROR_MARKERS):
            status = "POLL_ERROR"
        elif proc.returncode == 2:
            # Exit 2 is also click's usage-error code. Without the CLI's JSON result
            # it does not prove the job FAILED; let the caller ask the farm.
            status = "UNKNOWN"
    return WaitResult(
        returncode=proc.returncode,
        status=status,
        stdout=proc.stdout,
        stderr=proc.stderr,
    )


def _reports_job_status(stdout: str) -> bool:
    """True if ``deadline job wait`` printed its JSON result, so the exit code is real."""
    try:
        data = json.loads(stdout)
    except (TypeError, ValueError):
        return False
    return isinstance(data, dict) and "status" in data


def task_failure_messages(job_id: str) -> list[str] | None:
    """``progressMessage`` of every failed task run in the job, or None if unreadable.

    Says *why* a task failed, e.g. "TIMEOUT - Exceeded the allotted runtime limit."
    versus an aerender error. The status alone is FAILED for both. Reads with the
    caller's own Deadline Cloud credentials.
    """
    try:
        from deadline.client import api
        from deadline.client import config as dlconfig

        farm_id = dlconfig.get_setting("defaults.farm_id")
        queue_id = dlconfig.get_setting("defaults.queue_id")
        client = api.get_boto3_client("deadline")
        ids = {"farmId": farm_id, "queueId": queue_id, "jobId": job_id}
        messages: list[str] = []
        for page in client.get_paginator("list_sessions").paginate(**ids):
            for session in page.get("sessions", []):
                pager = client.get_paginator("list_session_actions")
                for actions in pager.paginate(sessionId=session["sessionId"], **ids):
                    for action in actions.get("sessionActions", []):
                        if "taskRun" not in (action.get("definition") or {}):
                            continue
                        if action.get("status") != "FAILED":
                            continue
                        detail = client.get_session_action(
                            sessionActionId=action["sessionActionId"], **ids
                        )
                        messages.append(detail.get("progressMessage") or "")
        return messages
    except Exception:  # noqa: BLE001 - any boto/credential error means "unreadable"
        return None


def job_status_counts(job_id: str) -> dict[str, Any]:
    """Return ``taskRunStatusCounts`` for a job, or ``{}`` if unavailable.

    A cheap, credential-tolerant way to learn the *real* terminal outcome when a
    ``wait`` poll failed (POLL_ERROR) or timed out locally. Never raises.
    """
    try:
        detail = get_job(job_id)
    except DeadlineError:
        return {}
    counts = detail.get("taskRunStatusCounts")
    return counts if isinstance(counts, dict) else {}


def get_job(job_id: str) -> dict[str, Any]:
    """The job's ``GetJob`` response, via the configured default farm and queue.

    Uses the API rather than ``deadline job get``, which has no JSON output option.
    """
    try:
        from deadline.client import api
        from deadline.client import config as dlconfig

        client = api.get_boto3_client("deadline")
        job = client.get_job(
            farmId=dlconfig.get_setting("defaults.farm_id"),
            queueId=dlconfig.get_setting("defaults.queue_id"),
            jobId=job_id,
        )
    except Exception as exc:
        raise DeadlineError(f"GetJob failed for {job_id}: {exc}") from exc
    job.pop("ResponseMetadata", None)
    return job
