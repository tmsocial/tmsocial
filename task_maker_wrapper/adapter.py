#!/usr/bin/env python3

import os
import json
import subprocess


TASK_MAKER = "task-maker"


def generate_value_event(key, value):
    yield dict(type="value", key=key, value=value)


def process_testcase_outcome(event):
    data = event["data"]
    path = f"subtask.{data['subtask']}.testcase.{data['testcase']}."
    yield from generate_value_event(path + "status", data["status"])
    yield from generate_value_event(path + "score", data["score"])
    yield from generate_value_event(path + "message", data["message"])


def process_result(event, source):
    subtask_results = event["testing"][source]["subtask_results"]
    for subtask, result in subtask_results.items():
        yield from generate_value_event(f"subtask.{subtask}.result", result)

    testcase_results = event["testing"][source]["testcase_results"]
    for subtask, testcases in testcase_results.items():
        for testcase, result in testcases.items():
            path =  f"subtask.{subtask}.testcase.{testcase}."
            yield from generate_value_event(path + "time_usage", result["result"][0]["resources"]["cpu_time"])
            yield from generate_value_event(path + "memory_usage", result["result"][0]["resources"]["memory"])
            yield from generate_value_event(path + "return_code", result["result"][0]["return_code"])
            yield from generate_value_event(path + "signal", result["result"][0]["signal"])
            yield from generate_value_event(path + "return_code", result["result"][0]["return_code"])
    

def process_event(event, source):
    action = event["action"]
    if action == "testcase-outcome":
        yield from process_testcase_outcome(event)
    if action == "result":
        yield from process_result(event, source)


def evaluate_submission(*, task_dir, files, evaluation_dir):
    files = list(map(os.path.abspath, files))

    stderr_file = os.path.join(evaluation_dir, "stderr.log")
    stdout_file = os.path.join(evaluation_dir, "stdout.log")
    events_file = os.path.join(evaluation_dir, "events.jsonl")
    with open(events_file, "w") as out, open(stderr_file, "w") as stderr, open(stdout_file, "w") as stdout:
        with subprocess.Popen([
            TASK_MAKER,
            "--ui", "json",
            "--task-dir", task_dir,
            "--dry-run",
            "--no-sanity-checks",
            "--cache", "reevaluate",
            *files
        ], stdout=subprocess.PIPE, stderr=stderr) as p:

            for line in p.stdout:
                print(line.decode("utf-8"), file=stdout, end="")
                for e in process_event(json.loads(line), os.path.split(files[0])[1]):
                    print(json.dumps(e), file=out)

        print(json.dumps({
            "type": "end",
            "return_code": p.returncode,
        }), file=out)
