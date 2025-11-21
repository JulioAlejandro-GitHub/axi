# camera_stream/stream_worker.py
import asyncio
import ffmpeg
import logging
from detector import Detector
from sender import Sender
from io import BytesIO


class StreamWorker:
    def __init__(self, camera, cfg):
        self.camera = camera
        self.cfg = cfg
        self.running = False
        self.detector = Detector(cfg['detector'])
        self.sender = Sender(cfg['backend'])
        self.task = None


    async def start(self):
        self.running = True
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, self._run)


    def _run(self):
        rtsp = (
            f"rtsp://{self.camera['camara_user']}:{self.camera['camara_pass']}@{self.camera['camara_hostname']}:{self.camera['camara_port']}/cam/realmonitor?channel=1&subtype=0"
        )
        input_kwargs = {'rtsp_transport': self.cfg['camera']['rtsp_transport']}
        process = (
            ffmpeg
            .input(rtsp, **input_kwargs)
            .output('pipe:', format='image2pipe', vcodec='mjpeg', r=self.cfg['camera']['fps'])
            .run_async(pipe_stdout=True, pipe_stderr=True)
        )


        buffer = b''
        SOI = b'\xff\xd8'
        EOI = b'\xff\xd9'
        read_size = self.cfg['camera'].get('rtsp_read_size', 4096)


        try:
            while self.running:
                chunk = process.stdout.read(read_size)
                if not chunk:
                    break
                buffer += chunk
                while True:
                    soi = buffer.find(SOI)
                    eoi = buffer.find(EOI, soi)
                    if soi != -1 and eoi != -1 and eoi > soi:
                        frame = buffer[soi:eoi+2]
                        buffer = buffer[eoi+2:]
                        # Detect person(s)
                        persons = self.detector.detect_persons(frame)
                        if persons:
                            # enviar al backend (HTTP POST)
                            self.sender.send_frame(frame, self.camera)
                        else:
                            break
        except Exception as e:
            logging.exception('StreamWorker error: %s', e)
        finally:
            process.terminate()

    async def stop(self):
        self.running = False