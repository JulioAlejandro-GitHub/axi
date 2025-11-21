# camera_stream/sender.py
import time
import threading
import requests
import logging
from io import BytesIO

class BatchSender:
    def __init__(self, cfg):
        self.url = cfg.get("recognition_url")
        self.timeout = cfg.get("timeout", 10)
        self.batch_interval = cfg.get("batch_interval_ms", 500) / 1000.0

        self.last_frame = None
        self.last_camera = None
        self.event = threading.Event()
        self.running = False

    def update_frame(self, jpeg_bytes, camera, force_send=False):
        self.last_frame = jpeg_bytes
        self.last_camera = camera

        if force_send:
            self.event.set()

    def start(self):
        self.running = True
        t = threading.Thread(target=self._loop, daemon=True)
        t.start()

    def stop(self):
        self.running = False
        self.event.set()

    def _loop(self):
        while self.running:
            # espera intervalo o evento de detección
            triggered = self.event.wait(self.batch_interval)
            self.event.clear()

            if self.last_frame and self.last_camera:
                self._send(self.last_frame, self.last_camera)

    def _send(self, jpeg_bytes, camera):
        try:
            files = {"file": ("frame.jpg", BytesIO(jpeg_bytes), "image/jpeg")}
            data = {
                "camera_id": camera.get("camara_id"),
                "camera_name": camera.get("nombre"),
            }
            resp = requests.post(self.url, files=files, data=data, timeout=self.timeout)
            resp.raise_for_status()

            logging.info(
                "BatchSender: frame enviado a backend: %s, status=%s",
                self.url,
                resp.status_code,
            )

        except Exception as e:
            logging.exception("BatchSender: error enviando frame: %s", e)
