"""The ``deadline-cloud-for-after-effects`` PyPI package is deprecated.

AWS Deadline Cloud for After Effects is now delivered by the shared
Deadline Cloud submitter installer; a separate PyPI adaptor package is
no longer required.

See: https://docs.aws.amazon.com/deadline-cloud/latest/userguide/submitter.html

This module is an empty stub — it exports no functionality. Importing it
raises a ``DeprecationWarning`` and returns.
"""

import warnings

warnings.warn(
    "The 'deadline-cloud-for-after-effects' PyPI package is deprecated. "
    "AWS Deadline Cloud for After Effects is now delivered by the shared "
    "Deadline Cloud submitter installer; a separate PyPI adaptor package "
    "is no longer required. Uninstall this package and follow the AWS "
    "Deadline Cloud User Guide: "
    "https://docs.aws.amazon.com/deadline-cloud/latest/userguide/submitter.html",
    DeprecationWarning,
    stacklevel=2,
)
