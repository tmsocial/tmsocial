#!/usr/bin/env python3

import json
import argparse

from metadata import generate_metadata
from adapter import evaluate_submission
from contest import new_contest
from user import add_user


parser = argparse.ArgumentParser()
subparsers = parser.add_subparsers(title="subcommand", dest="subcommand")

metadata_cli = subparsers.add_parser("metadata", help="generate task metadata")
metadata_cli.add_argument("--task-dir", help="task directory", required=True)

evaluate_cli = subparsers.add_parser("evaluate", help="evaluate a submission")
evaluate_cli.add_argument("--task-dir", help="task-directory", required=True)
evaluate_cli.add_argument("--file", help="path of the file to evaluate", nargs="+")
evaluate_cli.add_argument("--evaluation-dir", help="evaluation directory", required=True)

add_user_cli = subparsers.add_parser("add_user", help="add a new user to a site")
add_user_cli.add_argument("--site-dir", help="site to use", required=True)
add_user_cli.add_argument("--username", help="username of the new user", required=True)
add_user_cli.add_argument("--display-name", help="display name of the new user", required=True)
add_user_cli.add_argument("--password", help="password for the new user", required=True)

new_contest_cli = subparsers.add_parser("new_contest", help="create a new contest")
new_contest_cli.add_argument("--site-dir", help="site to use", required=True)
new_contest_cli.add_argument("--contest_name", help="name of the contest", required=True)


def main():
    args = parser.parse_args()

    if args.subcommand == "metadata":
        print(json.dumps(generate_metadata(
            task_dir=args.task_dir
        )))
    if args.subcommand == "evaluate":
        evaluate_submission(
            task_dir=args.task_dir,
            files=args.file,
            evaluation_dir=args.evaluation_dir,
        )
    if args.subcommand == "add_user":
        add_user(
            site_dir=args.site_dir,
            username=args.username,
            display_name=args.display_name,
            password=args.password,
        )
    if args.subcommand == "new_contest":
        new_contest(
            site_dir=args.site_dir,
            contest_name=args.contest_name,
        )


if __name__ == "__main__":
    main()
