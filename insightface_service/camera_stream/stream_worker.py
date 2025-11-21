# camera_stream/stream_worker.py
import asyncio
import ffmpeg
import logging
from detector import Detector
from sender import Sender
from io import BytesIO
import time


class StreamWorker:
    def __init__(self, camera, cfg):
        self.camera = camera
        self.cfg = cfg
        self.running = False
        self.detector = Detector(cfg['detector'])
        self.sender = Sender(cfg['backend'])
        self.reconnect_delay = cfg['camera'].get('reconnect_delay', 3)
        self.read_size = cfg['camera'].get('rtsp_read_size', 4096)


    async def start(self):
        self.running = True
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._main_loop)


    def _main_loop(self):
        """Mantiene reconexiones automáticas."""
        while self.running:
            try:
                self._run_ffmpeg()
            except Exception as e:
                logging.exception("StreamWorker fallo permanente: %s", e)

            if not self.running:
                break

            logging.warning(f"Reintentando conexión a {self.camera['camara_nombre']} en {self.reconnect_delay}s...")
            time.sleep(self.reconnect_delay)


    def _run_ffmpeg(self):
        """Procesa el streaming de RTSP → JPEG frames."""
        rtsp = (
            f"rtsp://{self.camera['camara_user']}:{self.camera['camara_pass']}"
            f"@{self.camera['camara_hostname']}:{self.camera['camara_port']}/cam/realmonitor?channel=1&subtype=0"
        )

        input_kwargs = {
            'rtsp_transport': self.cfg['camera']['rtsp_transport'],
            'stimeout': '5000000'   # 5s timeout → evita freeze
        }

        process = (
            ffmpeg
            .input(rtsp, **input_kwargs)
            .output(
                'pipe:',
                format='image2pipe',
                vcodec='mjpeg'
            )
            .run_async(pipe_stdout=True, pipe_stderr=True)
        )

        buffer = b''
        SOI = b'\xff\xd8'
        EOI = b'\xff\xd9'

        try:
            while self.running:
                chunk = process.stdout.read(self.read_size)
                if not chunk:
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

                    # detección (ejecutar rápido!)
                    persons = self.detector.detect_persons(frame)

                    if persons:
                        # Chile: persona dentro del cuadro
                        # Mandamos frame con detection inmediata
                        # self.sender.send_frame(frame, self.camera, force=True)

                        try:
                            self.sender.send_frame(frame, self.camera, force=True)
                        except Exception as e:
                            logging.error("Error enviando frame: %s", e)
                    else:
                        # No hay nuevos rostros pero sí actividad
                        # Se envía según el cooldown batch
                        # self.sender.send_frame(frame, self.camera, force=False)
                        try:
                            self.sender.send_frame(frame, self.camera, force=False)
                        except Exception as e:
                            logging.error("Error enviando frame: %s", e)


                    # if persons:
                    #     try:
                    #         self.sender.send_frame(frame, self.camera)
                    #     except Exception as e:
                    #         logging.error("Error enviando frame: %s", e)

        except Exception as e:
            logging.exception("Error en lectura RTSP: %s", e)

        finally:
            process.terminate()


    async def stop(self):
        self.running = False
