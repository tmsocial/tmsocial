import os
import base64

LANGUAGE_MAP = {
    "italian.pdf": "it",
    "english.pdf": "en",
}


def load_pdf_statement(path):
    with open(path, "rb") as f:
        return base64.encodebytes(f.read()).decode()


def generate_statement(*, task_dir):
    pdf_base64 = {
        LANGUAGE_MAP[path]: load_pdf_statement(
            os.path.join(task_dir, sub_dir, path))
        for sub_dir in ["statement", "testo"]
        if os.path.isdir(os.path.join(task_dir, sub_dir))
        for path in os.listdir(os.path.join(task_dir, sub_dir))
        if path in LANGUAGE_MAP
    }

    if len(pdf_base64) == 0:
        pdf_base64 = None

    return dict(
        html=dict(default="<html><body>Example HTML Statement</body></html>"),
        pdf_base64=pdf_base64,
    )
