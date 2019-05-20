#!/usr/bin/env python3

import os
import sys
import json
import subprocess


TASK_MAKER = "task-maker"

STATUS_MAP = {
    "ACCEPTED": "success",
    "SKIPPED": "skip",
}


def generate_value_event(key, value):
    yield dict(type="value", key=key, value=value)


def process_testcase_outcome(event):
    data = event["data"]
    path = f"subtask.{data['subtask']}.testcase.{data['testcase']}."
    yield from generate_value_event(path + "score", dict(type="score", score=data["score"]))
    yield from generate_value_event(path + "outcome", dict(type="outcome", outcome=STATUS_MAP.get(data["status"], "done")))
    yield from generate_value_event(path + "message", dict(type="message", message=dict(default=data["message"])))


def process_result(event, source):
    subtask_results = event["testing"][source]["subtask_results"]
    for subtask, result in subtask_results.items():
        yield from generate_value_event(f"subtask.{subtask}.result", result)

    testcase_results = event["testing"][source]["testcase_results"]
    for subtask, testcases in testcase_results.items():
        for testcase, result in testcases.items():
            path =  f"subtask.{subtask}.testcase.{testcase}."
            yield from generate_value_event(path + "time_usage",
                dict(type="time_usage", time_usage_seconds=result["result"][0]["resources"]["cpu_time"]))
            # FIXME: most likely they are kBs, not bytes
            yield from generate_value_event(path + "memory_usage",
                dict(type="memory_usage", memory_usage_bytes=result["result"][0]["resources"]["memory"]))
            # TODO: the following are not implemented in UI
            yield from generate_value_event(path + "return_code", result["result"][0]["return_code"])
            yield from generate_value_event(path + "signal", result["result"][0]["signal"])
    

def process_event(event, source):
    action = event["action"]
    if action == "testcase-outcome":
        yield from process_testcase_outcome(event)
    if action == "result":
        yield from process_result(event, source)


def evaluate_submission(*, task_dir, submission_dir, evaluation_dir):
    files_dir = os.path.join(submission_dir, "files")
    submitted_files = list(os.path.abspath(os.path.join(files_dir, f)) for f in os.listdir(files_dir))

    stderr_file = os.path.join(evaluation_dir, "stderr.log")
    stdout_file = os.path.join(evaluation_dir, "stdout.log")
    events_file = os.path.join(evaluation_dir, "events.jsonl")
    with open(events_file, "w") as out, open(stderr_file, "w") as stderr, open(stdout_file, "w") as stdout:
        with subprocess.Popen([
            TASK_MAKER,
            "--ui", "json",
            "--task-dir", task_dir,
            *submitted_files
        ], stdout=subprocess.PIPE, stderr=stderr) as p:

            for line in p.stdout:
                print(line.decode("utf-8"), file=stdout, end="")
                for e in process_event(json.loads(line), os.path.split(submitted_files[0])[1]):
                    print(json.dumps(e), file=out)

        print(json.dumps({
            "type": "end",
            "return_code": p.returncode,
        }), file=out)


def main():
    if len(sys.argv) < 4:
        print(f"Usage: {sys.argv[0]} <task_dir> <submission_dir> <evaluation_dir>", file=sys.stderr)
        exit(1)
    evaluate_submission(
        task_dir=sys.argv[1],
        submission_dir=sys.argv[2],
        evaluation_dir=sys.argv[3],
    )


if __name__ == "__main__":
    main()
