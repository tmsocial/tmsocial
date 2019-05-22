import json
import subprocess

from common import TASK_MAKER_EXE


def generate_metadata(*, task_dir):
    try:
        output = subprocess.check_output([
            TASK_MAKER_EXE,
            "--ui", "tmsocial",
            "--task-dir", task_dir,
            "--task-info",
        ])
    except subprocess.CalledProcessError:
        raise RuntimeError("error calling task maker")

    return json.loads(output)
