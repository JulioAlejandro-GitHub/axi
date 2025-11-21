# insightface_service/camera_stream/sender.py
import logging
import time
import hashlib
import requests
from io import BytesIO
from threading import Lock


class Sender:
    def __init__(self, cfg):
        self.url = cfg.get('recognition_url')
        self.timeout = cfg.get('timeout', 5)

        # Batch mode
        self.cooldown = cfg.get('cooldown_ms', 500) / 1000.0  # ms → sec
        self.max_retries = cfg.get('max_retries', 3)

        # Estado interno
        self.last_send_time = 0
        self.last_frame_hash = None

        self.lock = Lock()
        self.session = requests.Session()

    def _hash_frame(self, jpeg_bytes):
        """Retorna un hash SHA1 del frame para detectar cambios."""
        return hashlib.sha1(jpeg_bytes).hexdigest()

    def send_frame(self, jpeg_bytes, camera, force=False):
        now = time.time()

        frame_hash = self._hash_frame(jpeg_bytes)

        # -------------------------
        # ¿Es un nuevo rostro/evento?
        # -------------------------
        is_new_event = (frame_hash != self.last_frame_hash)
        # actualizar el hash solo si es nuevo -> evita cambio en cada envío
        if is_new_event:
            self.last_frame_hash = frame_hash

        # -------------------------
        # Lógica de envío batch
        # -------------------------
        if not force and not is_new_event:
            # Solo enviamos 1 cada cooldown si no hay novedad
            if now - self.last_send_time < self.cooldown:
                return False

        # -------------------------
        # Registrar envío
        # -------------------------
        with self.lock:
            self.last_send_time = now

        # -------------------------
        # Enviar frame
        # -------------------------
        files = {
            'file': ('frame.jpg', BytesIO(jpeg_bytes), 'image/jpeg')
        }

        data = {
            'camera_id': camera.get('camara_id'),
            'camera_name': camera.get('nombre'),
            'timestamp': int(now * 1000),
            'new_event': bool(is_new_event)
        }

        # Retries con backoff
        for attempt in range(1, self.max_retries + 1):
            try:
                resp = self.session.post(
                    self.url,
                    files=files,
                    data=data,
                    timeout=self.timeout
                )

                if resp.status_code == 200:
                    logging.info(
                        f"Frame enviado (new_event={is_new_event}) status={resp.status_code}"
                    )
                    return True
                else:
                    logging.warning(
                        f"Error HTTP {resp.status_code} en intento {attempt}/{self.max_retries}"
                    )

            except Exception as e:
                logging.error(
                    f"Error enviando frame (try {attempt}/{self.max_retries}): {e}"
                )

            time.sleep(0.3 * attempt)  # backoff

        logging.error("No se pudo enviar el frame después de múltiples intentos.")
        return False
