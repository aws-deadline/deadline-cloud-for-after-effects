# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

from __future__ import annotations

import logging
import os
import platform
import sys
import time
from types import FrameType
from typing import Optional

# The After Effects Adaptor adds the `openjd` namespace directory to PYTHONPATH, so that importing just the
# adaptor_runtime_client should work.
from ae_adaptor.AEClient.ae_handler import AEHandler
from ae_adaptor.AEClient.ipc import send_command, ipc_ready

try:
    from adaptor_runtime_client import ClientInterface  # type: ignore[import]
    from adaptor_runtime.process import LoggingSubprocess
    from adaptor_runtime.app_handlers import RegexHandler
except (ImportError, ModuleNotFoundError):
    from openjd.adaptor_runtime_client import ClientInterface  # type: ignore[import]
    from openjd.adaptor_runtime.process import LoggingSubprocess
    from openjd.adaptor_runtime.app_handlers import RegexHandler


logger = logging.getLogger(__name__)


class AEClient(ClientInterface):
    SOCKET_WAIT_SECONDS = 120

    def __init__(self, server_path: str) -> None:
        super().__init__(server_path)
        # List of actions that can be performed by the action queue
        self.actions.update({"close": self.close, "graceful_shutdown": self.graceful_shutdown})
        handler = AEHandler()
        self.actions.update(handler.action_dict)
        # afterfx -r '...' immediately exists upon starting script.
        client_path_abs = os.path.abspath(os.path.normpath(self.ae_client_path))
        if platform.system() == "Windows":
            # Escape backslashes in client path
            client_path_abs = client_path_abs.replace("\\", "\\\\")
        startup_script_inline = f"var x = new File('{client_path_abs}') ; x.open(); eval(x.read()); app.exitAfterLaunchAndEval = false;"

        ae_exe = os.environ.get("AFTEREFFECTS_ADAPTOR_AEFX_EXECUTABLE", "afterfx")

        # flag -noui for no ui doesn't close properly when running in monitor
        cmd_args = [ae_exe, "-noui", "-s", startup_script_inline]
        print(f"Starting AfterFX: {cmd_args}")
        # Set stdout and stderr to the system stdout and stderr to prevent shell getting blocked
        sys.__stdout__.flush()

        regexhandler = RegexHandler(list())
        self._ipc_client = LoggingSubprocess(
            args=cmd_args,
            stdout_handler=regexhandler,
            stderr_handler=regexhandler,
        )

    def close(self, args: Optional[dict] = None) -> None:
        send_command("shutdown_application", dict())

    def graceful_shutdown(self, signum: int, frame: FrameType | None):
        send_command("shutdown_application", dict())

    @property
    def ae_client_path(self) -> str:
        """
        Obtains the ae_client.jsx path by searching directories in sys.path

        :raises: FileNotFoundError: If the ae_client.jsx file could not be found.

        :returns: The path to the ae_client.jsx file.
        :return type: str
        """
        for dir_ in sys.path:
            path = os.path.join(dir_, "ae_adaptor", "clientipc", "ipc.jsx")
            if os.path.isfile(path):
                return path
        raise FileNotFoundError(
            f"Could not find ipc.jsx . Check that the AEClient package is in one of the following directories: "
            f"{sys.path[1:]}"
        )

    def wait_for_ipc(self, timeout=SOCKET_WAIT_SECONDS):
        start = time.time()
        while not ipc_ready():
            time.sleep(0.1)
            if time.time() - start > timeout:
                self._ipc_client.terminate()
                raise RuntimeError("Error waiting for After Effects IPC socket to come online")


def main():
    """
    Initializes the After Effects Client Interface if a server path was set
    """
    server_path = os.environ.get("AE_ADAPTOR_SERVER_PATH")
    if not server_path:
        raise OSError(
            "AEClient cannot connect to the Adaptor because the environment variable AE_ADAPTOR_SERVER_PATH "
            "does not exist"
        )

    if not os.path.exists(server_path):
        raise OSError(
            "AEClient cannot connect to the Adaptor because the socket at the path defined by the environment "
            "variable AE_ADAPTOR_SERVER_PATH does not exist. Got: "
            f"{os.environ['AE_ADAPTOR_SERVER_PATH']}"
        )

    client = AEClient(server_path)
    client.wait_for_ipc()
    client.poll()


if __name__ == "__main__":  # pragma: no cover
    logger.debug("starting after effects client")
    main()
