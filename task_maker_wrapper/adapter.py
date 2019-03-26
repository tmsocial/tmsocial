#!/usr/bin/env python3

import json


def generate_value_event(key, value):
    yield dict(type="value", key=key, value=value)


def process_testcase_outcome(event):
    data = event["data"]
    path = f"subtask.{data['subtask']}.testcase.{data['testcase']}."
    yield from generate_value_event(path + "status", data["status"])
    yield from generate_value_event(path + "score", data["score"])
    yield from generate_value_event(path + "message", data["message"])


def process_result(event):
    subtask_results = event["testing"]["solution.cpp"]["subtask_results"]
    for subtask, result in subtask_results.items():
        yield from generate_value_event(f"subtask.{subtask}.result", result)

    testcase_results = event["testing"]["solution.cpp"]["testcase_results"]
    for subtask, testcases in testcase_results.items():
        for testcase, result in testcases.items():
            path =  f"subtask.{subtask}.testcase.{testcase}."
            yield from generate_value_event(path + "time_usage", result["result"][0]["resources"]["cpu_time"])
            yield from generate_value_event(path + "memory_usage", result["result"][0]["resources"]["memory"])
            yield from generate_value_event(path + "return_code", result["result"][0]["return_code"])
            yield from generate_value_event(path + "signal", result["result"][0]["signal"])
            yield from generate_value_event(path + "return_code", result["result"][0]["return_code"])
    

def process_event(event):
    action = event["action"]
    if action == "testcase-outcome":
        yield from process_testcase_outcome(event)
    if action == "result":
        yield from process_result(event)


def main():
    while True:
        try:
            for e in process_event(json.loads(input())):
                print(json.dumps(e))
        except EOFError:
            exit(0)


if __name__ == "__main__":
    main()