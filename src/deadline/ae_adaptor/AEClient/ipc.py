# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""
ipc.jsx expect JSON payloads in the following structure:

{
    'command': <str>,
    'data': <dict>
}

It always replies with a single JSON compatible message.
"""

import json
import socket

DEFAULT_HOST = "localhost"
DEFAULT_PORT = 8008


def ipc_ready(host=None, port=None):
    host = host or DEFAULT_HOST
    port = port or DEFAULT_PORT
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        if not sock.connect_ex((host, port)):
            return True
    return False


def send_command(command: str, data: dict, host=None, port=None):
    host = host or DEFAULT_HOST
    port = port or DEFAULT_PORT
    payload = {"command": command, "data": data}
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.connect((host, port))
        request = json.dumps(payload).encode("ascii") + b"\n"
        s.sendall(request)
        response = s.recv(4096)
        return response
