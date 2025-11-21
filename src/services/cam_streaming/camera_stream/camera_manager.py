import logging
from .camera_worker import CameraWorker
from .sender import BatchSender

class CameraManager:
    def __init__(self, db, cfg):
        self.db = db
        self.cfg = cfg

        # batch sender que envía frames cada X ms
        self.sender = BatchSender(cfg["backend"])
        # self.sender.start()

        # listado de workers activos
        self.workers = {}

    async def load_initial_cameras(self):
        """
        Leer desde la BD las cámaras onvif en estado 'Activo'.
        """
        cams = await self.db.get_active_cameras()
        logging.info(f"[CameraManager] Cámaras Activas: {len(cams)}")

        for cam in cams:
            await self.start_camera(cam)

    async def start_camera(self, cam):
        cam_id = cam["camara_id"]

        if cam_id in self.workers:
            logging.info(f"[CameraManager] Cámara {cam_id} ya está activa.")
            return

        logging.info(f"[CameraManager] Iniciando cámara {cam_id}")

        worker = CameraWorker(
            cam_config=cam,
            sender_batch=self.sender,
            cfg=self.cfg
        )

        self.workers[cam_id] = worker
        await worker.start()

    async def stop_camera(self, cam_id: int):
        if cam_id not in self.workers:
            logging.warning(f"[CameraManager] Cámara {cam_id} no estaba activa.")
            return

        worker = self.workers[cam_id]
        await worker.stop()

        del self.workers[cam_id]

        logging.info(f"[CameraManager] Cámara {cam_id} detenida.")
