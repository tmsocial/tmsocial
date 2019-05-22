import os
import json
import subprocess

from common import TASK_MAKER_EXE

def evaluate_submission(*, task_dir, files, evaluation_dir):
    files = list(map(os.path.abspath, files))

    stderr_file = os.path.join(evaluation_dir, "stderr.log")
    events_file = os.path.join(evaluation_dir, "events.jsonl")
    with open(events_file, "w") as out, open(stderr_file, "w") as stderr, open(events_file, "w") as stdout:
        return_code = subprocess.check_call([
            TASK_MAKER_EXE,
            "--ui", "tmsocial",
            "--task-dir", task_dir,
            "--dry-run",
            "--no-sanity-checks",
            "--cache", "reevaluate",
            *files
        ], stdout=stdout, stderr=stderr)

        print(json.dumps({
            "type": "end",
            "return_code": return_code,
        }), file=stdout)
