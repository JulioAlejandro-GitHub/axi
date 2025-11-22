# insightface_service/camera_stream/detector.py
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import logging


class Detector:
    def __init__(self, cfg):
        self.cfg = cfg
        self.model = YOLO(cfg.get('yolo_model', 'yolov8n.pt'), verbose=False)
        self.min_conf = cfg.get('min_person_confidence', 0.35)

        # InsightFace carga opcional y solo una vez
        self.face_app = None
        if cfg.get("enable_insightface", False):
            self._load_insightface()

    def _load_insightface(self):
        try:
            import insightface
            model_name = self.cfg.get("insight_model", "buffalo_l")
            self.face_app = insightface.app.FaceAnalysis(name=model_name)
            self.face_app.prepare(
                ctx_id=self.cfg.get("insight_ctx", -1),
                det_size=tuple(self.cfg.get("insight_det_size", [320, 320]))
            )
            logging.info("InsightFace cargado correctamente.")
        except Exception as e:
            logging.error("Error cargando InsightFace: %s", e)
            self.face_app = None

    def _jpeg_to_np(self, jpeg_bytes):
        img = Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
        return np.array(img)

    def detect_persons(self, jpeg_bytes):
        img = self._jpeg_to_np(jpeg_bytes)
        results = self.model(img, verbose=False)

        persons = []
        for r in results:
            for box, cls, conf in zip(r.boxes.xyxy, r.boxes.cls, r.boxes.conf):
                name = r.names[int(cls)]
                if name == "person" and conf >= self.min_conf:
                    persons.append({
                        "box": box.tolist(),
                        "conf": float(conf)
                    })
        return persons

    def get_face_embedding(self, jpeg_bytes, box):
        if not self.face_app:
            logging.warning("InsightFace no inicializado.")
            return None

        img = Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
        x1, y1, x2, y2 = [int(v) for v in box]
        crop = img.crop((x1, y1, x2, y2))

        faces = self.face_app.get(np.array(crop))
        if not faces:
            return None
        return faces[0].embedding
