# camera_stream/detector.py
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import logging


class Detector:
def __init__(self, cfg):
self.cfg = cfg
self.model = YOLO(cfg.get('yolo_model', 'yolov8n.pt'))
self.min_conf = cfg.get('min_person_confidence', 0.35)
# InsightFace import delayed to avoid heavy init at import time
try:
import insightface
self.insight = insightface # if you want to use directly
except Exception as e:
logging.warning('InsightFace import failed: %s', e)
self.insight = None


def _jpeg_to_np(self, jpeg_bytes):
img = Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
return np.array(img)


def detect_persons(self, jpeg_bytes):
img = self._jpeg_to_np(jpeg_bytes)
results = self.model(img)
persons = []
for r in results:
for box, cls, conf in zip(r.boxes.xyxy, r.boxes.cls, r.boxes.conf):
# names mapping
name = r.names[int(cls)]
if name == 'person' and conf >= self.min_conf:
persons.append({'box': box.tolist(), 'conf': float(conf)})
return persons


# opcional: recortar rostro y obtener embedding con InsightFace
def get_face_embedding(self, jpeg_bytes, box):
if not self.insight:
return None
# recortar usando box
img = Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
x1, y1, x2, y2 = [int(v) for v in box]
crop = img.crop((x1, y1, x2, y2))
# llama insightface para embedding — ejemplo simplificado
af = self.insight.app.FaceAnalysis()
af.prepare(ctx_id=0, det_size=(160,160))
res = af.get(np.array(crop))
if res:
return res[0].embedding
return None