# camera_stream/camera_worker.py
import time
import threading
from .detector import Detector

class CameraWorker:
    def __init__(self, cam_config, sender_batch, cfg):
        self.cam = cam_config
        self.sender = sender_batch
        self.cfg = cfg

        self.detector = Detector(cfg)
        self.running = False

        self.last_detected = 0

    def start(self):
        self.running = True
        t = threading.Thread(target=self.loop, daemon=True)
        t.start()

    def stop(self):
        self.running = False

    def loop(self):
        while self.running:
            jpeg_bytes = self.capture_frame()

            persons = self.detector.detect_persons(jpeg_bytes)

            force_send = False
            if len(persons) != self.last_detected:
                force_send = True
                self.last_detected = len(persons)

            self.sender.update_frame(jpeg_bytes, self.cam, force_send=force_send)

            time.sleep(0.02)  # 50 FPS máximo (control simple)

    def capture_frame(self):
        """Implementación ONVIF / Webcam"""
        # (tu código existente)
        pass
