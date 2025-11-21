# camera_stream/sender.py
import time
import logging
import threading
import requests
from io import BytesIO


class BatchSender:
    """
    - Envía un frame inmediatamente si force=True (cuando hay detección).
    - Envía un frame cada N ms si no hay detección (batch mode).
    """

    def __init__(self, cfg: dict):
        self.url = cfg.get("recognition_url")
        self.timeout = cfg.get("timeout", 10)

        # batch settings
        self.batch_interval = cfg.get("batch_interval_ms", 500) / 1000.0  # default 500ms
        self.last_sent_ts = 0.0

        # thread-safe
        self.lock = threading.Lock()

        logging.info(f"[BatchSender] Inicializado. Enviando a {self.url}")

    # ----------------------------------------------------------------------
    # MÉTODO PRINCIPAL — ahora sí existe send_frame()
    # ----------------------------------------------------------------------
    def send_frame(self, jpeg_bytes: bytes, camera: dict, force=False):
        """
        Si force=True → enviar inmediatamente  
        Si force=False → respetar batch_interval
        """
        now = time.time()

        # Si no es forzado, verificar intervalo mínimo
        if not force:
            if now - self.last_sent_ts < self.batch_interval:
                return  # saltar frame

        # Enviar frame
        try:
            files = {
                "file": ("frame.jpg", BytesIO(jpeg_bytes), "image/jpeg")
            }
            data = {
                "camera_id": camera.get("camara_id"),
                "camera_name": camera.get("nombre")
            }

            resp = requests.post(self.url, files=files, data=data, timeout=self.timeout)
            resp.raise_for_status()

            logging.info(f"[BatchSender] Frame enviado a backend. force={force} status={resp.status_code}")

            self.last_sent_ts = now

        except Exception as e:
            logging.exception(f"[BatchSender] ERROR enviando frame: {e}")
