# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""When the integration harness cancels a farm job (test/integ/harness/deadline_client.py).

The render layer polls a real farm. A failed poll (expired credentials, a network
error) says nothing about the job, so cancelling then could kill a healthy job.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integ"))

from harness import deadline_client


@pytest.mark.parametrize(
    "effective, expected, cancel",
    [
        ("SUCCEEDED", "SUCCEEDED", False),
        ("FAILED", "FAILED", False),
        ("FAILED", "SUCCEEDED", True),
        ("CANCELED", "SUCCEEDED", True),
        ("SUCCEEDED", "FAILED", True),
        # Local wait budget elapsed with a working poll: the job is wedged.
        ("TIMEOUT", "SUCCEEDED", True),
        # The poll failed and the farm reported no terminal state: unknown, keep it.
        ("POLL_ERROR", "SUCCEEDED", False),
        ("UNKNOWN", "SUCCEEDED", False),
        ("POLL_ERROR", "FAILED", False),
    ],
)
def test_should_cancel(effective: str, expected: str, cancel: bool):
    assert deadline_client.should_cancel(effective, expected) is cancel
