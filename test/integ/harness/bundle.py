# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Read and assert on an OpenJD job bundle produced by the submitter (bundle-generation layer).

The submitter writes ``template.json``, ``parameter_values.json`` and
``asset_references.json``. We read whichever of ``.json``/``.yaml`` exists so the
harness keeps working if the submitter's output format ever changes.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# An onRun output arg, e.g. "{{Param._1_T19_emit_image__OutputDir}}/T19_emit_[#####].tif".
# The step's own name is the parameter prefix, which is how an output leaf is tied
# back to the step (and therefore to that step's Frames range) without guessing.
_OUTPUT_ARG_RE = re.compile(
    r"^\{\{Param\.(?P<prefix>.+?)_OutputDir\}\}[/\\](?P<leaf>.+)$"
)

# AE spells a sequence's frame field as a run of '#' in brackets: "name_[#####].tif".
# The run length is the zero-padding width.
_SEQUENCE_RE = re.compile(r"\[(#+)\]")

# The submitter's own defaults, from src/utils/Utils.jsx. A case that leaves a
# setting unset must produce these, so the same contract checks both directions:
# a setting that was applied, and one that was left alone.
DEFAULT_TASK_RUN_TIMEOUT_DAYS = 2
DEFAULT_TASK_RUN_TIMEOUT_HOURS = 0
DEFAULT_TASK_RUN_TIMEOUT_MINUTES = 0
DEFAULT_FRAMES_PER_TASK = 10
DEFAULT_MULTI_FRAME_RENDERING = False
DEFAULT_MAX_CPU_USAGE_PERCENTAGE = 90
DEFAULT_IGNORE_MISSING_DEPENDENCIES = False


def expected_job_parameters(settings: dict[str, Any]) -> dict[str, Any]:
    """The job parameter values a case's ``settings`` must produce in the bundle.

    Mirrors ``SubmitBundle.jsx``: these three settings are job-wide (since the
    render-options move in #322) and contribute one parameter value each rather
    than one per step. Booleans become the strings ``"ON"``/``"OFF"``.

    ``ChunkSize`` is deliberately absent: the submitter only declares it when the
    selection contains an image sequence, so it is asserted separately against
    :meth:`Bundle.has_chunking` rather than unconditionally expected here.
    """
    mfr = settings.get("multiFrameRendering", DEFAULT_MULTI_FRAME_RENDERING)
    imd = settings.get("ignoreMissingDependencies", DEFAULT_IGNORE_MISSING_DEPENDENCIES)
    return {
        "MultiFrameRendering": "ON" if mfr is True else "OFF",
        "MaxCpuUsagePercentage": settings.get(
            "maxCpuUsagePercentage", DEFAULT_MAX_CPU_USAGE_PERCENTAGE
        ),
        "IgnoreMissingDependencies": "ON" if imd is True else "OFF",
    }


def expected_task_timeout_s(settings: dict[str, Any]) -> int:
    """Seconds every step's ``onRun.timeout`` must carry for these settings.

    The submitter composes the timeout from three separate day/hour/minute fields,
    each defaulting independently — so a case that sets only ``taskRunTimeoutMinutes``
    still inherits the 2-day default for days unless it overrides that too. Spelling
    the arithmetic out here is what makes a partially-specified case assertable.
    """
    days = settings.get("taskRunTimeoutDays", DEFAULT_TASK_RUN_TIMEOUT_DAYS)
    hours = settings.get("taskRunTimeoutHours", DEFAULT_TASK_RUN_TIMEOUT_HOURS)
    minutes = settings.get("taskRunTimeoutMinutes", DEFAULT_TASK_RUN_TIMEOUT_MINUTES)
    return int(days) * 86400 + int(hours) * 3600 + int(minutes) * 60


def specifies_task_timeout(settings: dict[str, Any]) -> bool:
    """True if the case pins any component of the task-run timeout."""
    return any(
        k in settings
        for k in (
            "taskRunTimeoutDays",
            "taskRunTimeoutHours",
            "taskRunTimeoutMinutes",
        )
    )


@dataclass(frozen=True)
class StepOutput:
    """One step's rendered output, resolved from the template plus parameter values.

    The render layer needs to know *what files a step should have produced* before it
    can check the farm actually produced them. That means tying three separate pieces
    of the bundle together — the step's output arg (the filename), its ``_Frames``
    parameter (the range), and ``ChunkSize`` (how the range was split) — which is why
    this is a resolved object rather than three loose lookups.
    """

    step: str
    leaf: str
    output_dir: str | None
    frames: str | None
    chunk_size: int | None

    @property
    def is_sequence(self) -> bool:
        """True if this output is one file per frame rather than a single movie."""
        return _SEQUENCE_RE.search(self.leaf) is not None

    @property
    def padding(self) -> int:
        """Zero-padding width of the sequence's frame field (0 for a non-sequence)."""
        m = _SEQUENCE_RE.search(self.leaf)
        return len(m.group(1)) if m else 0

    def frame_range(self) -> tuple[int, int] | None:
        """``(first, last)`` from the step's ``_Frames`` value, or None if unparseable.

        The submitter writes an inclusive ``"first-last"``; a single-frame comp can
        appear as a bare number.
        """
        if not self.frames:
            return None
        text = str(self.frames).strip()
        m = re.fullmatch(r"(-?\d+)\s*-\s*(-?\d+)", text)
        if m:
            return int(m.group(1)), int(m.group(2))
        if re.fullmatch(r"-?\d+", text):
            n = int(text)
            return n, n
        return None

    def frame_filename(self, frame: int) -> str:
        """The leaf for one frame, e.g. frame 9 -> ``T19_emit_[#####].tif`` -> ``..._00009.tif``."""
        m = _SEQUENCE_RE.search(self.leaf)
        if not m:
            return self.leaf
        return (
            self.leaf[: m.start()]
            + str(frame).zfill(len(m.group(1)))
            + self.leaf[m.end() :]
        )

    def expected_filenames(self) -> list[str]:
        """Every leaf this step should have written, in frame order.

        A single file for a movie output; one per frame in the range for a sequence.
        This is the completeness oracle the output layer checks the farm's listing
        against — it is derived from the bundle, so it stays correct when a case's
        frame range or output module changes.
        """
        if not self.is_sequence:
            return [self.leaf]
        rng = self.frame_range()
        if rng is None:
            return []
        first, last = rng
        return [self.frame_filename(f) for f in range(first, last + 1)]


def _load(bundle_dir: Path, stem: str) -> Any | None:
    for ext in (".json", ".yaml", ".yml"):
        path = bundle_dir / f"{stem}{ext}"
        if path.exists():
            text = path.read_text(encoding="utf-8")
            if ext == ".json":
                return json.loads(text)
            import yaml  # optional; only needed if the submitter emits YAML

            return yaml.safe_load(text)
    return None


@dataclass
class Bundle:
    path: Path
    template: dict[str, Any]
    parameter_values: dict[str, Any]
    asset_references: dict[str, Any]

    @classmethod
    def load(cls, bundle_dir: Path) -> Bundle:
        template = _load(bundle_dir, "template")
        if template is None:
            raise FileNotFoundError(f"No template.(json|yaml) in bundle: {bundle_dir}")
        return cls(
            path=bundle_dir,
            template=template,
            parameter_values=_load(bundle_dir, "parameter_values") or {},
            asset_references=_load(bundle_dir, "asset_references") or {},
        )

    def param_default(self, name: str) -> Any:
        """A declared parameter's ``default``, or None.

        Some parameters are only ever declared with a default and never given a
        value — ``CondaPackages`` is one — so :meth:`param` returns None for them
        and an assertion on it would silently never run.
        """
        for d in self.template.get("parameterDefinitions") or []:
            if isinstance(d, dict) and d.get("name") == name:
                return d.get("default")
        return None

    def param(self, name: str) -> Any:
        """Value of a job parameter from parameter_values.json.

        Handles both the ``{"parameterValues": [{"name","value"}, ...]}`` shape and
        a plain ``{name: value}`` mapping.
        """
        pv = self.parameter_values
        entries = pv.get("parameterValues") if isinstance(pv, dict) else None
        if isinstance(entries, list):
            for entry in entries:
                if entry.get("name") == name:
                    return entry.get("value")
            return None
        return pv.get(name) if isinstance(pv, dict) else None

    @property
    def steps(self) -> list[dict[str, Any]]:
        return self.template.get("steps", []) or []

    def _refs(self) -> dict[str, Any]:
        """The assetReferences body, tolerating the nested or flat shape."""
        ar = self.asset_references
        return ar.get("assetReferences", ar) if isinstance(ar, dict) else {}

    def input_filenames(self) -> list[str]:
        """Input file references the submitter collected (project, footage, fonts)."""
        inputs = self._refs().get("inputs") or {}
        return [f for f in (inputs.get("filenames") or []) if f]

    def output_directories(self) -> list[str]:
        """Output directory references (where the render is written)."""
        outputs = self._refs().get("outputs") or {}
        return [d for d in (outputs.get("directories") or []) if d]

    def step_run_actions(self) -> list[dict[str, Any]]:
        """The ``script.actions.onRun`` mapping of every step (empty dict if absent)."""
        actions = []
        for step in self.steps:
            on_run = ((step.get("script") or {}).get("actions") or {}).get("onRun")
            actions.append(on_run if isinstance(on_run, dict) else {})
        return actions

    def step_run_timeouts(self) -> list[int | None]:
        """``script.actions.onRun.timeout`` (seconds) per step.

        This is where the submitter lands the UI's task-run timeout, so it is the
        only observable proof that a case's ``taskRunTimeout*`` settings took
        effect. Note the harness's own :func:`deadline_client.apply_job_metadata`
        *overwrites* this before submitting — so assert it before that patch runs.
        """
        return [a.get("timeout") for a in self.step_run_actions()]

    def parameter_definition_names(self) -> set[str]:
        """Names of the job parameters the template *declares*.

        Distinct from :meth:`param`, which reads the supplied *values*. Some
        parameters are declared conditionally — ``ChunkSize`` only when the
        selection contains an image sequence — so the declaration itself carries
        information about what the submitter decided the submission was.
        """
        defs = self.template.get("parameterDefinitions") or []
        return {d.get("name") for d in defs if isinstance(d, dict) and d.get("name")}

    def has_chunking(self) -> bool:
        """True if the submitter emitted image-sequence frame chunking.

        ``ChunkSize`` (definition *and* value) is only produced when the selection
        contains an image-sequence output module. Video outputs must render in a
        single task, so ``framesPerTask`` is silently inert for them — the
        submitter's own UI says "img seq only ... Has no effect on video output".
        """
        return "ChunkSize" in self.parameter_definition_names()

    def step_task_ranges(self) -> list[str]:
        """Every step's task-parameter ``range`` expression.

        For a chunked step this is ``"{{Param.<step>_Frames}}:{{Param.ChunkSize}}"``
        — the frame range split by the chunk size, which is what actually fans the
        step out into multiple tasks. Asserting ``ChunkSize``'s *value* alone is not
        enough: a submitter that declared the parameter but left it out of the range
        would emit one task for the whole range and still satisfy that check.
        """
        ranges = []
        for step in self.steps:
            space = step.get("parameterSpace") or {}
            for td in space.get("taskParameterDefinitions") or []:
                rng = td.get("range")
                if isinstance(rng, str):
                    ranges.append(rng)
        return ranges

    def output_filenames(self) -> list[str]:
        """Rendered output paths as the template's step args name them.

        Each step's ``onRun.args`` carries the output path for its comp, built from
        a ``{{Param.<step>_OutputDir}}`` reference plus the filename the render
        queue item writes.
        """
        outs = []
        for on_run in self.step_run_actions():
            for arg in on_run.get("args") or []:
                if "_OutputDir}}" in str(arg):
                    outs.append(str(arg))
        return outs

    def step_outputs(self) -> list[StepOutput]:
        """Each step's output resolved against this bundle's parameter values.

        Pairs the output arg's filename with the step's own ``_Frames`` range and the
        job-wide ``ChunkSize``, so callers can compute both the full expected file list
        and a chunk-boundary sample of it. Steps whose onRun carries no
        ``{{Param.*_OutputDir}}`` arg are skipped rather than guessed at.
        """
        resolved: list[StepOutput] = []
        chunk = self.param("ChunkSize")
        chunk_size = (
            int(chunk)
            if isinstance(chunk, (int, float, str))
            and str(chunk).strip().lstrip("-").isdigit()
            else None
        )
        for on_run in self.step_run_actions():
            for arg in on_run.get("args") or []:
                m = _OUTPUT_ARG_RE.match(str(arg))
                if not m:
                    continue
                prefix = m.group("prefix")
                resolved.append(
                    StepOutput(
                        step=prefix,
                        leaf=m.group("leaf"),
                        output_dir=self.param(f"{prefix}_OutputDir"),
                        frames=self.param(f"{prefix}_Frames"),
                        chunk_size=chunk_size,
                    )
                )
        return resolved

    def as_text(self) -> str:
        """All three bundle docs concatenated — for substring assertions."""
        return "\n".join(
            json.dumps(d, indent=2, default=str)
            for d in (self.template, self.parameter_values, self.asset_references)
        )
