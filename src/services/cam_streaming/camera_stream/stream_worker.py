# camera_stream/stream_worker.py
import time
import logging
import asyncio
import cv2

from .detector import Detector
from .sender import BatchSender  # usamos el mismo BatchSender que ya tienes


class StreamWorker:
    """
    Worker de streaming para una cámara:
      - Abre RTSP con OpenCV
      - Lee frames
      - Detecta personas con YOLO (Detector)
      - Envía frames al backend usando BatchSender:
          * force=True  → enviar inmediatamente (cuando hay personas)
          * force=False → respetar batch/cooldown
    """

    def __init__(self, cam_config, sender, cfg):
        self.camera = cam_config      # dict con info de la cámara desde BD
        self.sender = sender          # instancia de BatchSender
        self.cfg = cfg
        self.running = True

        # Detector YOLO
        self.detector = Detector(cfg["detector"])

        # Parametros de cámara
        cam_cfg = cfg.get("camera", {})
        self.reconnect_delay = cam_cfg.get("reconnect_delay", 3)      # segundos entre reintentos
        self.fps = cam_cfg.get("fps", 3)                              # frames por segundo máx
        self.batch_interval = 1.0 / max(self.fps, 0.1)                # intervalo mínimo entre frames "normales"

        self.last_batch_sent_ts = 0.0

        logging.info(f"[StreamWorker] Inicializado para cámara {self.camera.get('camara_id')} - {self.camera.get('nombre')}")

    # ----------------------------------------------------------------------
    # API asíncrona para integrarse con asyncio (CameraWorker usa create_task)
    # ----------------------------------------------------------------------
    async def run(self):
        """
        Método asíncrono que delega el bucle bloqueante de OpenCV a un hilo.
        """
        await asyncio.to_thread(self._loop_capture)

    # ----------------------------------------------------------------------
    # Bucle principal de captura (bloqueante, corre en un hilo aparte)
    # ----------------------------------------------------------------------
    def _loop_capture(self):
        url = (
            f"rtsp://{self.camera.get('camara_user')}:{self.camera.get('camara_pass')}"
            f"@{self.camera.get('camara_hostname')}:{self.camera.get('camara_port')}"
            "/cam/realmonitor?channel=1&subtype=0"
        )

        logging.warning(f"[RTSP-OPENCV] Abriendo cámara: {url}")

        while self.running:
            cap = cv2.VideoCapture(url)

            if not cap.isOpened():
                logging.warning("[RTSP-OPENCV] No se pudo abrir la cámara. Reintentando en %ss...", self.reconnect_delay)
                time.sleep(self.reconnect_delay)
                continue

            logging.info(f"[RTSP-OPENCV] Cámara {self.camera.get('camara_id')} abierta correctamente.")

            while self.running:
                ret, frame = cap.read()
                if not ret:
                    logging.warning("[RTSP-OPENCV] Frame inválido o fin de stream, reconectando...")
                    break

                # Codificar a JPEG
                ok, jpeg = cv2.imencode(".jpg", frame)
                if not ok:
                    continue

                jpeg_bytes = jpeg.tobytes()

                # Detección de personas
                try:
                    persons = self.detector.detect_persons(jpeg_bytes)
                except Exception as e:
                    logging.exception("[StreamWorker] Error en detector: %s", e)
                    persons = []

                now = time.time()
                force = bool(persons)

                # Modo batch:
                # - Si hay personas → envío inmediato
                # - Si no hay personas → respetar intervalo mínimo entre frames
                if not force:
                    # si no ha pasado suficiente tiempo desde el último envío batch, saltar este frame
                    if now - self.last_batch_sent_ts < self.batch_interval:
                        continue

                try:
                    self.sender.send_frame(jpeg_bytes, self.camera, force=force)
                    if force or (now - self.last_batch_sent_ts >= self.batch_interval):
                        self.last_batch_sent_ts = now
                except Exception as e:
                    logging.exception("[StreamWorker] Error enviando frame: %s", e)

            cap.release()
            logging.info("[RTSP-OPENCV] Cerrando VideoCapture, reintentando en %ss...", self.reconnect_delay)
            time.sleep(self.reconnect_delay)

        logging.info(f"[StreamWorker] Loop terminado para cámara {self.camera.get('camara_id')}")

    # ----------------------------------------------------------------------
    # Detener worker
    # ----------------------------------------------------------------------
    async def stop(self):
        self.running = False
        logging.info(f"[StreamWorker] Stop solicitado para cámara {self.camera.get('camara_id')}")
