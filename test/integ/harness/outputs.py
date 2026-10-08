# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Retrieve and sample a finished job's rendered output from the farm.

A job's outputs are uploaded to the queue's job-attachments S3 bucket and are
retrievable, but the obvious route — ``deadline job download-output`` — is wrong for
a test harness on two counts:

* It has **no destination flag**. It writes to the absolute output path recorded at
  submit time, so where the files land is decided by whoever submitted rather than by
  the test. (The harness solves that upstream, by patching the bundle's
  ``*_OutputDir`` parameters before submit — see
  :func:`deadline_client.redirect_output_dir`.)
* It downloads **everything**. One 60-frame TIFF sequence is ~476 MB because AE's
  TIFF output module is uncompressed and not scriptable (the format and compression
  keys are read-only — see RENDER_FINDINGS.md #11), so a 300-frame case would move
  ~2.4 GB in each direction per run.

So we drive ``deadline.job_attachments`` directly, which supports the two things the
CLI does not, and gives a two-tier check:

**Tier 1 — completeness, zero bytes.** :func:`list_outputs` reads the output manifests
and returns every path the job wrote, with no file transfer at all. That is what
proves all 300 frames exist; it needs no pixels.

**Tier 2 — content, sampled.** :func:`download_outputs` takes glob include-filters, so
only the sampled frames move. The sample comes from
:func:`chunk_boundary_sample`, which is deliberately *not* a fixed fraction: see its
docstring for why a first/middle/last sample would miss the only frames that matter.
"""

from __future__ import annotations

import functools
from dataclasses import dataclass
from pathlib import Path
from typing import Any


class OutputsMismatch(AssertionError):
    """The job's outputs are reachable but do not contain what was asked for.

    An AssertionError so pytest reports it as a failure, never a skip.
    """


class OutputsUnavailable(RuntimeError):
    """The farm's outputs could not be reached (credentials, config, or no manifests).

    Distinct from "the outputs are wrong": callers treat this as an environment
    problem — a skip, or a failure under ``--strict-environment``.
    """


MAX_SAMPLED_SEAMS = 8


def chunk_boundary_sample(
    first: int, last: int, chunk_size: int | None = None
) -> list[int]:
    """Frame numbers to fetch for content checking: the ends plus every chunk seam.

    A naive sample is the trap here. T08 renders frames 0-299 with ``ChunkSize`` 100,
    so the farm runs three tasks — ``0-99``, ``100-199``, ``200-299`` — and chunking
    bugs live *exactly* at the seams: an off-by-one slice, a frame rendered twice, a
    frame dropped between tasks, a task handed the wrong range. A first/middle/last
    sample of that range is frames 0, 150 and 299, which misses **both** seams and so
    would pass while the feature the case exists to test is broken.

    So the sample is derived from the chunk size the bundle actually carries: both
    frames either side of every seam, plus the first and last frame of the range. For
    0-299 at 100 that is ``[0, 99, 100, 199, 200, 299]`` — 6 frames (~50 MB) instead of
    300 (~2.4 GB), while covering strictly more of what can go wrong.

    With no chunking (a movie output, or a chunk larger than the range) this reduces to
    ``[first, last]``.
    """
    if last < first:
        first, last = last, first
    frames = {first, last}
    if chunk_size and chunk_size > 0:
        seams = list(range(first + chunk_size, last + 1, chunk_size))
        # A tiny chunk size makes almost every frame a seam (chunk 1 = all 300 of
        # T08's ~8 MB frames). Keep at most MAX_SAMPLED_SEAMS, spread evenly.
        if len(seams) > MAX_SAMPLED_SEAMS:
            step = len(seams) / MAX_SAMPLED_SEAMS
            seams = [seams[int(i * step)] for i in range(MAX_SAMPLED_SEAMS)]
        for seam in seams:
            frames.add(seam - 1)  # last frame of the preceding task
            frames.add(seam)  # first frame of the next one
    return sorted(frames)


@dataclass
class _QueueContext:
    farm_id: str
    queue_id: str
    s3_settings: Any
    session: Any


@functools.lru_cache(maxsize=1)
def _queue_context() -> _QueueContext:
    """Farm/queue ids, job-attachment S3 settings, and a queue-role boto3 session.

    Listing and downloading outputs reads the job-attachments bucket, which the
    *user's* credentials cannot do — the bucket is reachable only by the queue role.
    ``get_queue_user_boto3_session`` performs that assume-role, which is the same thing
    the CLI does internally; without it the first ListObjectsV2 fails with
    ``InvalidToken``. Cached because the assume-role is not free and the answer is
    constant for a run.
    """
    try:
        from deadline.client import api
        from deadline.client import config as dlconfig
        from deadline.job_attachments.models import JobAttachmentS3Settings
    except ImportError as exc:  # pragma: no cover - depends on the installed CLI
        raise OutputsUnavailable(f"deadline client library unavailable: {exc}") from exc

    farm_id = dlconfig.get_setting("defaults.farm_id")
    queue_id = dlconfig.get_setting("defaults.queue_id")
    if not farm_id or not queue_id:
        raise OutputsUnavailable(
            "no default farm/queue configured (deadline config show)"
        )

    try:
        client = api.get_boto3_client("deadline")
        queue = client.get_queue(farmId=farm_id, queueId=queue_id)
        attachments = queue.get("jobAttachmentSettings")
        if not attachments:
            raise OutputsUnavailable(
                f"queue {queue_id} has no job attachment settings, so outputs are "
                "never uploaded and cannot be validated"
            )
        session = api.get_queue_user_boto3_session(
            deadline=client,
            farm_id=farm_id,
            queue_id=queue_id,
            queue_display_name=queue.get("displayName"),
        )
    except OutputsUnavailable:
        raise
    except Exception as exc:  # boto/credential failures are all "unavailable"
        raise OutputsUnavailable(
            f"could not reach farm {farm_id}/{queue_id}: {exc}"
        ) from exc

    return _QueueContext(
        farm_id=farm_id,
        queue_id=queue_id,
        s3_settings=JobAttachmentS3Settings(**attachments),
        session=session,
    )


def _downloader(job_id: str, include_filters: list[str] | None = None):
    try:
        from deadline.job_attachments.download import OutputDownloader
    except ImportError as exc:  # pragma: no cover
        raise OutputsUnavailable(
            f"deadline job_attachments unavailable: {exc}"
        ) from exc

    ctx = _queue_context()
    try:
        return OutputDownloader(
            s3_settings=ctx.s3_settings,
            farm_id=ctx.farm_id,
            queue_id=ctx.queue_id,
            job_id=job_id,
            session=ctx.session,
            include_filters=include_filters,
        )
    except Exception as exc:
        raise OutputsUnavailable(f"could not read outputs for {job_id}: {exc}") from exc


def list_outputs(job_id: str) -> dict[str, list[str]]:
    """Every output path the job wrote, keyed by asset root. Transfers no file bytes.

    This reads the job's output manifests only, so it is cheap enough to call for a
    300-frame sequence and is the basis of the completeness check: compare these names
    against :meth:`bundle.StepOutput.expected_filenames`. Paths are relative to their
    root and use forward slashes regardless of platform.
    """
    return _downloader(job_id).get_paths_by_root()


def output_leaf_names(job_id: str) -> set[str]:
    """Bare filenames of everything the job wrote, across all roots.

    The harness asserts on leaf names rather than full paths because the root is the
    submitting machine's absolute output directory — which the bundle patch controls
    and which differs between hosts — while the leaves are what the output module
    actually names.
    """
    leaves: set[str] = set()
    for paths in list_outputs(job_id).values():
        for p in paths:
            leaves.add(p.replace("\\", "/").rsplit("/", 1)[-1])
    return leaves


def download_outputs(job_id: str, leaf_names: list[str] | None = None) -> list[Path]:
    """Download the job's outputs, optionally narrowed to specific leaf filenames.

    ``leaf_names`` becomes one ``*/<name>`` glob each, so only those files move. Pass
    None to fetch everything — correct for a single movie output, wasteful for a
    sequence (hence :func:`chunk_boundary_sample`).

    Files land at the output path recorded in the job, which the harness has already
    pointed at the case's artifact directory. Existing files are overwritten rather
    than copied aside: the CLI's default ``CREATE_COPY`` would silently accumulate
    ``name (1).tif`` across re-runs and the test would then assert against a stale
    frame while a fresh one sat beside it.
    """
    from deadline.job_attachments.models import FileConflictResolution

    filters = [f"*/{name}" for name in leaf_names] if leaf_names else None
    downloader = _downloader(job_id, include_filters=filters)

    if filters:
        # Guard against a filter that matches nothing: download() would report a
        # cheerful zero-file success and the content check would silently pass.
        selected = sum(len(v) for v in downloader.get_paths_by_root().values())
        if selected == 0:
            raise OutputsMismatch(
                f"no output of job {job_id} matched {filters} — the job's outputs "
                "exist but none of the sampled frames are among them"
            )

    try:
        downloader.download(file_conflict_resolution=FileConflictResolution.OVERWRITE)
    except Exception as exc:
        raise OutputsUnavailable(f"download failed for {job_id}: {exc}") from exc

    downloaded: list[Path] = []
    for root, paths in downloader.get_paths_by_root().items():
        for rel in paths:
            downloaded.append(Path(root) / rel)
    return downloaded
