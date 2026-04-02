#!/bin/sh
set -eu

MAIN_CLASS="${1:-Main}"

javac -d /workspace/build "/workspace/source/${MAIN_CLASS}.java" 2>/workspace/build/compile.stderr || {
    cat /workspace/build/compile.stderr >&2
    exit 10
}

exec java -Xms32m -Xmx64m -cp /workspace/build "${MAIN_CLASS}"
