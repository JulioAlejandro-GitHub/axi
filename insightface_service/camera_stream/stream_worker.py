# insightface_service/camera_stream/stream_worker.py
import time
import logging
import ffmpeg
from detector import Detector
from sender import Sender

class StreamWorker:
    def __init__(self, camera, cfg):
        self.camera = camera
        self.cfg = cfg
        self.running = False
        self.detector = Detector(cfg['detector'])
        self.sender = Sender(cfg['backend'])
        self.reconnect_delay = cfg['camera'].get('reconnect_delay', 3)
        self.read_size = cfg['camera'].get('rtsp_read_size', 4096)

    def run(self):
        """Entrypoint para Thread: mantiene reconexiones automáticas."""
        self.running = True
        while self.running:
            try:
                self._run_ffmpeg()
            except Exception as e:
                logging.exception("StreamWorker fallo: %s", e)

            if not self.running:
                break

            logging.warning(f"Reintentando conexión a camera {self.camera.get('nombre')} en {self.reconnect_delay}s...")
            time.sleep(self.reconnect_delay)

    def _run_ffmpeg(self):
        """Procesa el streaming de RTSP → JPEG frames."""
        rtsp = (
            f"rtsp://{self.camera.get('camara_user')}:{self.camera.get('camara_pass')}"
            f"@{self.camera.get('camara_hostname')}:{self.camera.get('camara_port')}/cam/realmonitor?channel=1&subtype=0"
        )

        input_kwargs = {
            'rtsp_transport': self.cfg['camera'].get('rtsp_transport', 'tcp'),
            'stimeout': str(int(self.cfg['camera'].get('ffmpeg_stimeout_ms', 5000000)))  # microsegundos para ffmpeg
        }

        process = (
            ffmpeg
            .input(rtsp, **input_kwargs)
            .output('pipe:', format='image2pipe', vcodec='mjpeg')
            .run_async(pipe_stdout=True, pipe_stderr=True)
        )

        buffer = b''
        SOI = b'\xff\xd8'
        EOI = b'\xff\xd9'

        try:
            while self.running:
                chunk = process.stdout.read(self.read_size)
                if not chunk:
                    logging.debug("No chunk received, breaking read loop")
                    break

                buffer += chunk

                # extraer múltiples JPEGs por buffer
                while True:
                    soi = buffer.find(SOI)
                    if soi == -1:
                        break

                    eoi = buffer.find(EOI, soi)
                    if eoi == -1:
                        break

                    frame = buffer[soi:eoi+2]
                    buffer = buffer[eoi+2:]

                    # detección (rápida)
                    try:
                        persons = self.detector.detect_persons(frame)
                    except Exception as e:
                        logging.exception("Detector error: %s", e)
                        persons = []

                    if persons:
                        # Si hay detecciones, forzamos envío inmediato (nuevo evento)
                        try:
                            self.sender.send_frame(frame, self.camera, force=True)
                        except Exception:
                            logging.exception("Error enviando frame detectado")
                    else:
                        # no se detectó persona → enviar acorde al batch/cooldown
                        try:
                            self.sender.send_frame(frame, self.camera, force=False)
                        except Exception:
                            logging.exception("Error enviando frame en batch")

        except Exception as e:
            logging.exception("Error en lectura RTSP: %s", e)

        finally:
            try:
                process.terminate()
            except Exception:
                pass

    def stop(self):
        self.running = False
