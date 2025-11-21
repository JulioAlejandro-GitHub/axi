#!/bin/bash
cd "$(dirname "$0")"
python3 -m venv venv_stream
source venv_stream/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
