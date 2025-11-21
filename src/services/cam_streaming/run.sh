#!/bin/bash
cd "$(dirname "$0")"
export PYTHONPATH=$(pwd)
source venv_stream/bin/activate
python3 main.py
