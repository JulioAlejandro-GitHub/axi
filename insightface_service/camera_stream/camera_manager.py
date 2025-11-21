# camera_stream/camera_manager.py
import asyncio
import logging
from config import load_config
from db_adapter import BD_GetOnvifCameras, BDupdCamara
from stream_worker import StreamWorker


class CameraManager:
    def __init__(self, cfg=None):
        self.cfg = cfg or load_config()
        self.cameras = []
        self.workers = {}
        self.refresh_interval = self.cfg['camera']['refresh_interval'] / 1000.0
        logging.basicConfig(filename=self.cfg['logging']['file'], level=self.cfg['logging']['level'])


    async def start(self):
        # loop principal
        while True:
            await self.process_cameras()
            await asyncio.sleep(self.refresh_interval)


    async def process_cameras(self):
        cam_list = await BD_GetOnvifCameras()
        if not cam_list:
            logging.info('No active ONVIF cameras found')
            return
        # iniciar workers nuevos
        for cam in cam_list:
            cam_id = cam['camara_id']
            if cam_id not in self.workers:
                worker = StreamWorker(cam, self.cfg)
                self.workers[cam_id] = worker
                asyncio.create_task(worker.start())
            else:
                # TODO: actualizar config si cambió
                pass


    async def stop_camera(self, camara_id):
        worker = self.workers.get(camara_id)
        if worker:
            await worker.stop()
            del self.workers[camara_id]