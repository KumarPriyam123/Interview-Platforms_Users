"""One-time script to clean formatting artifacts from existing MongoDB question texts."""
from __future__ import annotations

import os
import re
from pathlib import Path

from dotenv import load_dotenv
from pymongo import MongoClient

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(ENV_PATH)

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()


def clean_question_text(raw: str) -> str:
    text = raw
    text = text.replace("\u200b", "").replace("\ufeff", "")
    text = text.replace("\\'", "'")
    text = re.sub(r'" +"', '"', text)
    text = re.sub(r' +"', '"', text)
    text = text.replace("&nbsp;", " ")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&amp;", "&")
    text = text.replace("&quot;", '"')
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main():
    client = MongoClient(MONGODB_URI)
    coll = client["test"]["datasetquestions"]
    count = 0
    for doc in coll.find({}, {"questionText": 1}):
        old = doc["questionText"]
        cleaned = clean_question_text(old)
        if cleaned != old:
            coll.update_one({"_id": doc["_id"]}, {"$set": {"questionText": cleaned}})
            count += 1
    print(f"Cleaned {count} documents")


if __name__ == "__main__":
    main()
