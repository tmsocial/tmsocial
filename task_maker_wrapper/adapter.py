#!/usr/bin/env python3

import json


def generate_value_event(key, value):
    print(json.dumps(dict(type="value", key=key, value=value)))


def process_testcase_outcome(event):
    data = event["data"]
    path = f"subtask.{data['subtask']}.testcase.{data['testcase']}."
    generate_value_event(path + "status", data["status"])
    generate_value_event(path + "score", data["score"])
    generate_value_event(path + "message", data["message"])


def process_result(event):
    subtask_results = event["testing"]["soluzione.cpp"]["subtask_results"]
    for subtask, result in subtask_results.items():
        generate_value_event(f"subtask.{subtask}.result", result)

    testcase_results = event["testing"]["soluzione.cpp"]["testcase_results"]
    for subtask, testcases in testcase_results.items():
        for testcase, result in testcases.items():
            path =  f"subtask.{subtask}.testcase.{testcase}."
            generate_value_event(path + "time_usage", result["result"][0]["resources"]["cpu_time"])
            generate_value_event(path + "memory_usage", result["result"][0]["resources"]["memory"])
            generate_value_event(path + "return_code", result["result"][0]["return_code"])
            generate_value_event(path + "signal", result["result"][0]["signal"])
            generate_value_event(path + "return_code", result["result"][0]["return_code"])
    

def process_event(event):
    action = event["action"]
    if action == "testcase-outcome":
        process_testcase_outcome(event)
    if action == "result":
        process_result(event)


def main():
    while True:
        try:
            process_event(json.loads(input()))
        except EOFError:
            exit(0)


if __name__ == "__main__":
    main()