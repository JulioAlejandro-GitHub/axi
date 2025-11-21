# camera_stream/detector.py
import numpy as np
from ultralytics import YOLO
from PIL import Image
import io
import logging
import threading


class Detector:
    def __init__(self, cfg):
        self.cfg = cfg
        self.model = YOLO(cfg.get('yolo_model', 'yolov8n.pt'))
        self.min_conf = cfg.get('min_person_confidence', 0.35)

        # Cargar InsightFace 1 sola vez (heavy)
        self.insight = None
        self.face_app = None
        if cfg.get("enable_insightface", False):
            self._load_insightface()


    def _load_insightface(self):
        """Carga InsightFace de manera segura y solo una vez."""
        try:
            import insightface
            self.insight = insightface

            # inicializar FaceAnalysis 1 sola vez
            self.face_app = insightface.app.FaceAnalysis(
                name=self.cfg.get("insight_model", "buffalo_l")
            )

            # ctx_id=-1 = CPU, ctx_id=0 = GPU
            self.face_app.prepare(
                ctx_id=self.cfg.get("insight_ctx", -1),
                det_size=tuple(self.cfg.get("insight_det_size", [320, 320]))
            )

            logging.info("InsightFace cargado correctamente.")

        except Exception as e:
            logging.error("Error cargando InsightFace: %s", e)
            self.face_app = None


    def _jpeg_to_np(self, jpeg_bytes):
        """Convierte un JPEG en numpy (rápido)."""
        img = Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
        return np.array(img)


    def detect_persons(self, jpeg_bytes):
        """Detecta personas usando YOLO."""
        img = self._jpeg_to_np(jpeg_bytes)

        # YOLOv8 inference
        results = self.model(img, verbose=False)

        persons = []

        for r in results:
            boxes = r.boxes.xyxy
            classes = r.boxes.cls
            confs = r.boxes.conf
            names = r.names

            for box, cls, conf in zip(boxes, classes, confs):
                if names[int(cls)] == "person" and float(conf) >= self.min_conf:
                    persons.append({
                        "box": box.cpu().numpy().tolist(),
                        "conf": float(conf)
                    })

        return persons


    def get_face_embedding(self, jpeg_bytes, box):
        """Extrae un embedding facial desde InsightFace."""
        if not self.face_app:
            logging.warning("InsightFace no inicializado. No se puede extraer embedding.")
            return None

        img = Image.open(io.BytesIO(jpeg_bytes)).convert('RGB')
        x1, y1, x2, y2 = [int(v) for v in box]
        crop = img.crop((x1, y1, x2, y2))

        # Procesar con InsightFace
        faces = self.face_app.get(np.array(crop))

        if not faces:
            return None

        return faces[0].embedding
