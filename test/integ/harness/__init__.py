# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""After Effects Deadline Cloud submitter integration-test harness.

Re-drives the real submitter headlessly to build a job bundle, asserts on the
bundle offline (bundle-generation layer), then submits it to a Deadline Cloud farm
and polls to a terminal state (render layer).
"""
