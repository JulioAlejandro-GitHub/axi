# camera_stream/camera_manager.py
import time
import threading
from insightface_service.database.camera import CameraDB

class CameraManager:
    def __init__(self, db: CameraDB, interval=5):
        self.db = db
        self.interval = interval
        self.cameras = {}
        self.running = False

    def load_cameras(self):
        rows = self.db.get_active_cameras()
        ids_in_db = set()

        for cam in rows:
            cid = cam["camara_id"]
            ids_in_db.add(cid)

            # cámara nueva → iniciar thread
            if cid not in self.cameras:
                print(f"[CameraManager] Nueva cámara cargada: {cam['nombre']}")
                self.cameras[cid] = cam
                self.start_camera_thread(cam)

        # cámaras removidas de BD
        for cid in list(self.cameras.keys()):
            if cid not in ids_in_db:
                print(f"[CameraManager] Cámara desactivada: {cid}")
                self.stop_camera(cid)
                del self.cameras[cid]

    def start_camera_thread(self, cam):
        # tu implementación existente
        pass

    def stop_camera(self, cam_id):
        # tu implementación existente
        pass

    def run(self):
        self.running = True
        while self.running:
            self.load_cameras()
            time.sleep(self.interval)
