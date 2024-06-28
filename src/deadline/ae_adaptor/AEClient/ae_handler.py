# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

from __future__ import annotations

import os
import logging
from typing import Optional

from ae_adaptor.AEClient.ipc import send_command

logger = logging.getLogger(__name__)


class AEHandler:
    """Handler for After Effects"""

    def __init__(self):
        self.action_dict = {
            "start_render": self.start_render,
            "output_file_path": self.set_output_file_path,
            "output_pattern": self.set_output_pattern,
            "output_format": self.set_output_format,
            "project_file": self.set_project_file,
            "comp_name": self.set_comp_name,
        }
        self.comp_name: Optional[str] = None
        self.output_dir = None
        self.output_pattern = None
        self.output_format = None
        self.file_path = None

    def start_render(self, data: dict) -> None:
        """
        Starts a render.

        :param data: The data given from the Adaptor. Keys expected: ['frame']
        :type data: dict
        """
        frame = data.get("frame")
        if frame is None:
            raise RuntimeError("AEClient: start_render called without a frame number.")

        if (
            self.comp_name is None
            or self.output_dir is None
            or self.output_pattern is None
            or self.output_format is None
            or self.file_path is None
        ):
            message = """Error: AEClient: start_render called without at least one of: "
    * an output directory,
    * an output pattern,
    * an output format,
    * a project filepath, or
    * a comp name"""
            print(message)
            raise RuntimeError(message)

        # Create the folder(s) if the directory doesn't exist
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)

        data.update(
            {
                "comp_name": self.comp_name,
                "output_dir": self.output_dir,
                "output_pattern": self.output_pattern,
                "output_format": self.output_format,
            }
        )
        resp = send_command("start_render", data)
        logger.info("RESPONSE")
        print(resp, flush=True)

    def set_output_file_path(self, data: dict) -> None:
        """
        Sets the output file path.

        :param data: The data given from the Adaptor. Keys expected: ['output_file_path']
        :type data: dict
        """
        logger.debug("setting output path")
        render_dir = data.get("output_file_path")
        if render_dir:
            self.output_dir = render_dir

    def set_output_pattern(self, data: dict) -> None:
        """
        Sets the output file pattern.

        :param data: The data given from the Adaptor. Keys expected: ['output_pattern']
        :type data: dict
        """
        logger.debug("setting output pattern")
        pattern = data.get("output_pattern")
        if pattern:
            self.output_pattern = pattern

    def set_output_format(self, data: dict) -> None:
        """
        Sets the output file format.

        :param data: The data given from the Adaptor. Keys expected: ['output_format']
        :type data: dict
        """
        logger.debug("setting output format")
        format_ = data.get("output_format")
        if format_:
            self.output_format = format_

    def set_comp_name(self, data: dict) -> None:
        """
        Sets the comp name.

        :param data: The data given from the Adaptor. Keys expected: ['comp_name']
        :type data: dict

        :raises: RuntimeError: if comp doesn't exist
        """
        comp_name = data.get("comp_name")
        self.comp_name = comp_name
        resp = send_command("set_comp_name", data)
        logger.info("RESPONSE")
        print(resp)

    def set_project_file(self, data: dict):
        """
        Opens a project file in After Effects.

        :param data: The data given from the Adaptor. Keys expected: ['project_file']

        :raises: FileNotFoundError: If the file provided in the data dictionary does not exist.
        """
        logger.debug("opening after effects scene")
        self.file_path = data.get("project_file", "")
        if not os.path.isfile(self.file_path):
            print(f"Error: The project file '{self.file_path}' does not exist")
            raise FileNotFoundError(f"Error: The scene file '{self.file_path}' does not exist")

        resp = send_command("open_project", data)
        logger.info("RESPONSE")
        print(resp)
