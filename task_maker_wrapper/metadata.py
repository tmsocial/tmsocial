#!/usr/bin/env python3

import sys
import json
import subprocess


TASK_MAKER = "task-maker"


def gen_path(subtask, testcase, field):
    return f"subtask.{subtask}.testcase.{testcase}.{field}"


def generate_cells(subtask, testcase):
    yield dict(number=testcase)
    yield dict(value=dict(type="ref", ref=gen_path(subtask, testcase, "outcome")), type="outcome")
    yield dict(value=dict(type="ref", ref=gen_path(subtask, testcase, "score")), type="score")
    yield dict(value=dict(type="ref", ref=gen_path(subtask, testcase, "memory_usage")), type="memory_usage")
    yield dict(value=dict(type="ref", ref=gen_path(subtask, testcase, "time_usage")), type="time_usage")
    yield dict(value=dict(type="ref", ref=gen_path(subtask, testcase, "signal")), type="signal")
    yield dict(value=dict(type="ref", ref=gen_path(subtask, testcase, "return_code")), type="return_code")
    yield dict(value=dict(type="ref", ref=gen_path(subtask, testcase, "message")), type="message")


def generate_testcases(subtask, data):
    for testcase, data in data["cases"].items():
        yield dict(title=f"Test case {testcase}", cells=list(generate_cells(subtask, testcase)))


def generate_subtasks(metadata):
    for subtask, data in metadata["subtasks"].items():
        yield dict(max_score=data["max_score"], title=f"Subtask {subtask}", rows=list(generate_testcases(subtask, data)))


def generate_table(metadata):
    return dict(
        type="table",
        columns=[
            dict(type="row_number", name=dict(default="Test Case")),
            dict(type="outcome", name=dict(default="Outcome")),
            dict(type="score", name=dict(default="Score")),
            dict(type="memory_usage", name=dict(default="Memory Usage")),
            dict(type="time_usage", name=dict(default="Time Usage")),
            dict(type="signal", name=dict(default="Exit signal")),
            dict(type="return_code", name=dict(default="Return code")),
            dict(type="message", name=dict(default="Message")),
        ],
        groups=list(generate_subtasks(metadata)),
    )


def generate_metadata(*, task_dir):
    try:
        output = subprocess.check_output([
            TASK_MAKER,
            "--ui", "json",
            "--task-dir", task_dir,
            "--task-info",
        ])
    except subprocess.CalledProcessError:
        raise RuntimeError("Error calling task maker")

    metadata = json.loads(output)

    return {
        "name": metadata["name"],
        "title": metadata["title"],
        "evaluation_sections": [
            generate_table(metadata),
        ],
    }


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <task_dir>", file=sys.stderr)
        exit(1)

    try:
        metadata = generate_metadata(
            task_dir=sys.argv[1],
        )
        print(json.dumps(metadata))
    except RuntimeError as e:
        print(e, file=sys.stderr)
        exit(1)


if __name__ == "__main__":
    main()
