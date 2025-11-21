#!/bin/bash
cd "$(dirname "$0")"
python3 -m venv venv_insight
source venv_insight/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
