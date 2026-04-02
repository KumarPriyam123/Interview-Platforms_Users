#!/bin/sh
set -eu

g++ /workspace/source/main.cpp -O2 -std=c++17 -o /workspace/build/program 2>/workspace/build/compile.stderr || {
    cat /workspace/build/compile.stderr >&2
    exit 10
}

exec /workspace/build/program
