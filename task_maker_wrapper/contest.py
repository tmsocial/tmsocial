import os
import json


def new_contest(*, site_dir, contest_name, **kwargs):
    contest_dir = os.path.join(site_dir, "contests", contest_name)

    if os.path.exists(contest_dir):
        raise RuntimeError(f"contest {contest_name} already exist")

    os.makedirs(contest_dir)

    contest = {
        "name": contest_name,
        **kwargs,
    }

    with open(os.path.join(contest_dir, "data.json"), "w") as f:
        print(json.dumps(contest), file=f)
