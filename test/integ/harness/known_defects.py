# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Checks against what was authored in AE, and the submitter defects they expose.

Some checks compare the submitter's job with an oracle written down when the comp was
authored (frame ranges, output names), not with the submitter's own formula. A
defect those checks expose is registered here, scoped to one case, one check and the
comps it affects. :class:`AuthoredChecks` then settles every mismatch:

* a mismatch the registry does not cover fails the test;
* a registered comp that no longer mismatches fails the test, so a fix cannot hide
  behind the entry, which then has to be removed;
* anything else is the known defect, reported as an xfail by the caller.

Mismatches are collected for every comp before settling, so a known defect on one
comp never hides a regression on another.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Check names.
FRAMES = "frames"  # bundle frame ranges vs the ranges authored in AE
TASK_FRAMES = "task_frames"  # farm task frames vs the ranges authored in AE
OUTPUT_NAMES = "output_names"  # bundle output file names vs AE's output modules
REFUSAL = "refusal"  # the submitter refuses a queue item it must not submit


@dataclass(frozen=True)
class KnownDefect:
    case: str
    check: str
    comps: tuple[str, ...]
    reason: str


# Empty is the healthy state. Each entry names a KNOWN_ISSUES.md section.
KNOWN_DEFECTS: tuple[KnownDefect, ...] = (
    KnownDefect(
        "T23",
        OUTPUT_NAMES,
        ("T23 padding_4",),
        "submitter uses the URI-encoded output file name: '[####]' becomes "
        "'%5B####%5D' (KNOWN_ISSUES.md #8)",
    ),
    KnownDefect(
        "T24",
        REFUSAL,
        ("T24 braces",),
        "the submitter's '{{' output-name check never fires, because it sees the "
        "URI-encoded '%7B%7B' (KNOWN_ISSUES.md #8)",
    ),
)


@dataclass
class AuthoredChecks:
    """Mismatches against what was authored in AE, settled against KNOWN_DEFECTS."""

    case: str
    defects: tuple[KnownDefect, ...] = KNOWN_DEFECTS
    checked: dict[str, set[str]] = field(default_factory=dict)
    mismatches: dict[str, dict[str, str]] = field(default_factory=dict)

    def compare(self, check: str, comp: str, got, want, what: str) -> None:
        """Record whether ``comp`` passed ``check``; ``what`` describes the values."""
        self.checked.setdefault(check, set()).add(comp)
        if got != want:
            self.mismatches.setdefault(check, {})[
                comp
            ] = f"{what}: got {got!r}, authored {want!r}"

    def settle(self) -> str | None:
        """Fail on anything unexpected; return the known-defect reasons, or None."""
        mine = [d for d in self.defects if d.case == self.case]
        known = {(d.check, c) for d in mine for c in d.comps}

        unexpected = [
            f"[{check}] {comp}: {msg}"
            for check, by_comp in self.mismatches.items()
            for comp, msg in by_comp.items()
            if (check, comp) not in known
        ]
        fixed = [
            f"[{d.check}] {comp}"
            for d in mine
            for comp in d.comps
            if comp in self.checked.get(d.check, set())
            and comp not in self.mismatches.get(d.check, {})
        ]
        problems = []
        if unexpected:
            problems.append(
                "does not match what was authored in AE:\n  " + "\n  ".join(unexpected)
            )
        if fixed:
            problems.append(
                "now matches AE, so its known defect looks fixed; remove the entry from "
                "harness/known_defects.py:\n  " + "\n  ".join(fixed)
            )
        if problems:
            raise AssertionError(f"{self.case} " + "\n".join(problems))

        hit = [
            d.reason
            for d in mine
            if any(c in self.mismatches.get(d.check, {}) for c in d.comps)
        ]
        return "; ".join(hit) or None
