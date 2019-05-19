import os
import json


def add_user(*, site_dir, username, display_name, password):
    user_path = os.path.join(site_dir, "users", username)

    if os.path.exists(user_path):
        raise RuntimeError(f"user {username} already exists")

    os.makedirs(user_path)

    user = {
        "username": username,
        "display_name": display_name,
        "authentication_mode": "plaintext_password",
        "password": password,
    }

    with open(os.path.join(user_path, "data.json"), "w") as f:
        print(json.dumps(user), file=f)
