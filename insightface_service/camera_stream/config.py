# camera_stream/config.py
import yaml
from pathlib import Path


def load_config(path: str = None):
p = Path(path or Path(__file__).parent / 'config.yaml')
with p.open('r') as f:
return yaml.safe_load(f)