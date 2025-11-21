import asyncio
import logging
from .stream_worker import StreamWorker

class CameraWorker:
    def __init__(self, cam_config, sender_batch, cfg):
        self.camera = cam_config          # dict con datos de BD
        self.sender = sender_batch        # BatchSender
        self.cfg = cfg
        self.stream_worker = None
        self.stream_task = None

    async def start(self):
        logging.info(f"[CameraWorker] Iniciando worker para cámara {self.camera['camara_id']}")

        self.stream_worker = StreamWorker(
            cam_config=self.camera,
            sender=self.sender,
            cfg=self.cfg
        )

        # ejecutar worker asíncrono en segundo plano
        self.stream_task = asyncio.create_task(self.stream_worker.run())

    async def stop(self):
        logging.info(f"[CameraWorker] Deteniendo cámara {self.camera['camara_id']}")

        if self.stream_worker:
            await self.stream_worker.stop()

        if self.stream_task:
            self.stream_task.cancel()
            try:
                await self.stream_task
            except:
                pass

        logging.info(f"[CameraWorker] Cámara {self.camera['camara_id']} detenida")
