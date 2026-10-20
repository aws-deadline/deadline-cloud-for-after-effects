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
    "effective, expected, farm_read, cancel",
    [
        ("SUCCEEDED", "SUCCEEDED", True, False),
        ("FAILED", "FAILED", True, False),
        ("FAILED", "SUCCEEDED", True, True),
        ("CANCELED", "SUCCEEDED", True, True),
        ("SUCCEEDED", "FAILED", True, True),
        # A clean terminal exit code is the farm's answer even without counts.
        ("FAILED", "SUCCEEDED", False, True),
        # Wait budget elapsed and the farm still reports tasks in flight: wedged.
        ("TIMEOUT", "SUCCEEDED", True, True),
        # Wait budget elapsed and the farm is unreadable: unknown, keep it.
        ("TIMEOUT", "SUCCEEDED", False, False),
        # The poll failed and the farm reported no terminal state: unknown, keep it.
        ("POLL_ERROR", "SUCCEEDED", True, False),
        ("POLL_ERROR", "SUCCEEDED", False, False),
        ("UNKNOWN", "SUCCEEDED", False, False),
        ("POLL_ERROR", "FAILED", True, False),
    ],
)
def test_should_cancel(effective: str, expected: str, farm_read: bool, cancel: bool):
    assert deadline_client.should_cancel(effective, expected, farm_read) is cancel
