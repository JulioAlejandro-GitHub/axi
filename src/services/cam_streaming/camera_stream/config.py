import yaml
import os
from typing import Optional


def load_config(path: Optional[str] = None):
    if path is None:
        base = os.path.dirname(os.path.abspath(__file__))
        path = os.path.join(base, "config.yaml")

    with open(path, "r") as f:
        return yaml.safe_load(f)
