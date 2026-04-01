from __future__ import annotations

import json
import os
import time
from pathlib import Path

import kagglehub
from kagglehub import KaggleDatasetAdapter
from dotenv import load_dotenv
from pymongo import MongoClient, UpdateOne


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "").strip()
MONGODB_DB = os.getenv("MONGODB_DB", "test").strip() or "test"
COLLECTION = os.getenv("MONGODB_DATASET_COLLECTION", "datasetquestions").strip() or "datasetquestions"
KAGGLE_DATASET = "guitaristboy/coding-questions-dataset"
KAGGLE_FILE = "questions_dataset.csv"
MAX_ROWS = int(os.getenv("MAX_ROWS", "0") or "0")


def safe_json(value, fallback=None):
    """Parse a JSON string, returning fallback on failure."""
    if fallback is None:
        fallback = []
    if not value or not isinstance(value, str):
        return fallback
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return fallback


def parse_examples(raw_examples):
    """Convert dataset examples to our schema format."""
    items = safe_json(raw_examples, [])
    result = []
    for ex in items:
        if not isinstance(ex, dict):
            continue
        inp = ex.get("input", "")
        out = ex.get("output", "")
        result.append({
            "input": json.dumps(inp) if isinstance(inp, (dict, list)) else str(inp),
            "output": json.dumps(out) if isinstance(out, (dict, list)) else str(out),
            "explanation": str(ex.get("explanation", "")),
        })
    return result


def parse_test_cases(raw_test_cases):
    """Convert dataset test_cases to visible/hidden test case arrays."""
    items = safe_json(raw_test_cases, [])
    visible = []
    hidden = []
    for i, tc in enumerate(items):
        if not isinstance(tc, dict):
            continue
        inp = tc.get("input", {})
        out = tc.get("expected_output", tc.get("output", ""))
        case = {**inp, "output": json.dumps(out) if isinstance(out, (dict, list)) else str(out)}
        # First 3 test cases are visible, rest are hidden
        if i < 3:
            visible.append(case)
        else:
            hidden.append({**case, "hidden": True})
    return visible, hidden


def parse_constraints(raw_constraints):
    """Parse constraints JSON string to a list of strings."""
    items = safe_json(raw_constraints, [])
    return [str(c) for c in items if str(c).strip()]


def build_cpp_signature_from_test(test_cases_raw):
    """Attempt to infer a C++ function signature from the test case input keys."""
    items = safe_json(test_cases_raw, [])
    if not items or not isinstance(items[0], dict):
        return "string solve(const string& rawInput)"
    inp = items[0].get("input", {})
    if not isinstance(inp, dict):
        return "string solve(const string& rawInput)"
    # Build params from input keys
    params = []
    for key in inp:
        params.append(f"const auto& {key}")
    if not params:
        return "string solve(const string& rawInput)"
    return f"auto solve({', '.join(params)})"


def make_doc(row):
    """Build a MongoDB document from a dataset row."""
    question_id = str(row.get("id", ""))
    title = str(row.get("title", "Coding Question"))
    difficulty = str(row.get("difficulty_level", "medium")).strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "medium"

    description = str(row.get("description", title))
    examples = parse_examples(row.get("examples"))
    constraints = parse_constraints(row.get("constraints"))
    visible, hidden_cases = parse_test_cases(row.get("test_cases"))
    cpp_sig = build_cpp_signature_from_test(row.get("test_cases"))

    return {
        "dataset": KAGGLE_DATASET,
        "split": "train",
        "questionId": question_id,
        "title": title,
        "difficulty": difficulty,
        "tags": [],
        "questionText": description,
        "cppSignature": cpp_sig,
        "constraints": constraints,
        "examples": examples,
        "visibleTestCases": visible,
        "hiddenTestCases": hidden_cases,
        "sourceRow": {},
    }


def main():
    if not MONGODB_URI:
        raise RuntimeError("MONGODB_URI is required in ai-interview-service/.env")

    print(f"Loading Kaggle dataset: {KAGGLE_DATASET}")
    df = kagglehub.load_dataset(
        KaggleDatasetAdapter.PANDAS,
        KAGGLE_DATASET,
        KAGGLE_FILE,
    )
    print(f"Dataset loaded: {len(df)} rows, columns: {list(df.columns)}")

    if MAX_ROWS > 0:
        df = df.head(MAX_ROWS)

    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    collection = db[COLLECTION]

    # Remove all old questions first
    delete_result = collection.delete_many({})
    print(f"Cleared {delete_result.deleted_count} old questions from {COLLECTION}")

    collection.create_index("questionId", unique=True)

    operations = []
    for _, row in df.iterrows():
        doc = make_doc(row)
        operations.append(
            UpdateOne(
                {"questionId": doc["questionId"]},
                {"$set": doc},
                upsert=True,
            )
        )

    if not operations:
        print("No rows available to import")
        return

    BATCH_SIZE = 50
    total_upserted = 0
    total_modified = 0
    for i in range(0, len(operations), BATCH_SIZE):
        batch = operations[i : i + BATCH_SIZE]
        try:
            result = collection.bulk_write(batch, ordered=False)
            total_upserted += result.upserted_count
            total_modified += result.modified_count
            print(f"  Batch {i // BATCH_SIZE + 1}: upserted={result.upserted_count}, modified={result.modified_count}")
        except Exception as e:
            print(f"  Batch {i // BATCH_SIZE + 1} failed: {e}. Retrying in 5s...")
            time.sleep(5)
            result = collection.bulk_write(batch, ordered=False)
            total_upserted += result.upserted_count
            total_modified += result.modified_count
            print(f"  Batch {i // BATCH_SIZE + 1} retry OK: upserted={result.upserted_count}")
        time.sleep(1)  # Rate-limit for Atlas free tier

    print(f"\nImport complete!")
    print(f"Inserted: {total_upserted}")
    print(f"Updated: {total_modified}")
    print(f"Total questions: {collection.count_documents({})}")


if __name__ == "__main__":
    main()
