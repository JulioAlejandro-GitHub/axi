# camera_stream/camera_manager.py
from .camera_worker import CameraWorker
from .sender import BatchSender

class CameraManager:
    def __init__(self, db, cfg):
        self.db = db
        self.cfg = cfg
        self.sender = BatchSender(cfg)
        self.sender.start()

        self.workers = {}

    def start_camera(self, cam):
        worker = CameraWorker(cam, self.sender, self.cfg)
        self.workers[cam["camara_id"]] = worker
        worker.start()

    def stop_camera(self, cam_id):
        if cam_id in self.workers:
            self.workers[cam_id].stop()
            del self.workers[cam_id]
