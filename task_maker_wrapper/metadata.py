#!/usr/bin/env python3

import json


def gen_path(subtask, testcase, field):
    return f"subtask.{subtask}.testcase.{testcase}.{field}"


def generate_cells(subtask, testcase):
    yield dict(value=dict(type="ref", key=gen_path(subtask, testcase, "outcome")), type="outcome"),
    yield dict(value=dict(type="ref", key=gen_path(subtask, testcase, "total_score")), type="total_score"),
    yield dict(value=dict(type="ref", key=gen_path(subtask, testcase, "memory_usage")), type="memory_usage"),
    yield dict(value=dict(type="ref", key=gen_path(subtask, testcase, "time_usage")), type="time_usage"),
    yield dict(value=dict(type="ref", key=gen_path(subtask, testcase, "signal")), type="signal"),
    yield dict(value=dict(type="ref", key=gen_path(subtask, testcase, "return_code")), type="return_code"),
    yield dict(value=dict(type="ref", key=gen_path(subtask, testcase, "message")), type="message"),


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
            dict(type="outcome"),
            dict(type="total_score"),
            dict(type="memory_usage"),
            dict(type="time_usage"),
            dict(type="signal"),
            dict(type="return_code"),
            dict(type="message"),
        ],
        sections=list(generate_subtasks(metadata)),
    )


def main():
    metadata = json.loads(input())
    print(json.dumps(generate_table(metadata)))

if __name__ == "__main__":
    main()