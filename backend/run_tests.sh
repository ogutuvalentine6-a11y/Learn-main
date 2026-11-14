#!/usr/bin/env bash
# Run the pytest suite. Requires MongoDB running locally.
set -e
cd "$(dirname "$0")"
python -m pytest "$@"
