# insightface_service/camera_stream/camera_manager.py
import yaml
import time
import logging
import hashlib
from threading import Thread, Lock

from .stream_worker import StreamWorker


class CameraManager:
    def __init__(self, cfg):
        self.cfg = cfg
        self.camera_file = cfg.get("camera_file", "cameras.yml")

        self.workers = {}           # camera_id → StreamWorker
        self.worker_threads = {}    # camera_id → Thread
        
        self.lock = Lock()
        self.last_file_hash = None
        self.running = False


    # ------------------------------------------------------------
    # Utilidad: leer archivo y calcular hash
    # ------------------------------------------------------------
    def _load_camera_file(self):
        try:
            with open(self.camera_file, "rb") as f:
                content = f.read()
                hash_value = hashlib.md5(content).hexdigest()
                cameras = yaml.safe_load(content)
                return cameras, hash_value
        except Exception as e:
            logging.error(f"Error leyendo cámaras: {e}")
            return None, None


    # ------------------------------------------------------------
    # Iniciar un stream de cámara
    # ------------------------------------------------------------
    def _start_camera(self, camera_cfg):
        cam_id = camera_cfg.get("camara_id")

        worker = StreamWorker(camera_cfg, self.cfg)
        thread = Thread(target=worker.run, daemon=True)

        self.workers[cam_id] = worker
        self.worker_threads[cam_id] = thread

        thread.start()
        logging.info(f"🟢 Cámara iniciada: {cam_id}")


    # ------------------------------------------------------------
    # Detener un stream
    # ------------------------------------------------------------
    def _stop_camera(self, cam_id):
        worker = self.workers.get(cam_id)
        if worker:
            worker.stop()

        # No matamos el thread manualmente; el worker detiene el loop
        self.workers.pop(cam_id, None)
        self.worker_threads.pop(cam_id, None)

        logging.info(f"🔴 Cámara detenida: {cam_id}")


    # ------------------------------------------------------------
    # Recarga dinámica
    # ------------------------------------------------------------
    def _apply_camera_changes(self, new_cameras):
        new_ids = set(cam["camara_id"] for cam in new_cameras)
        old_ids = set(self.workers.keys())

        # -----------------------------
        # 1) Cámaras nuevas → iniciar
        # -----------------------------
        for cam in new_cameras:
            cam_id = cam["camara_id"]
            if cam_id not in old_ids:
                self._start_camera(cam)

            else:
                # comparar config para saber si cambió
                if cam != self.workers[cam_id].camera:
                    logging.info(f"🔄 Reiniciando cámara por cambios: {cam_id}")
                    self._stop_camera(cam_id)
                    self._start_camera(cam)

        # -----------------------------
        # 2) Cámaras eliminadas → detener
        # -----------------------------
        removed = old_ids - new_ids
        for cam_id in removed:
            self._stop_camera(cam_id)


    # ------------------------------------------------------------
    # Watcher principal
    # ------------------------------------------------------------
    def _watch_cameras(self):
        while self.running:
            new_cameras, new_hash = self._load_camera_file()
            if not new_cameras:
                time.sleep(2)
                continue

            with self.lock:
                if new_hash != self.last_file_hash:
                    logging.info("♻️ Detectado cambio en cameras.yml, aplicando...")
                    self.last_file_hash = new_hash
                    self._apply_camera_changes(new_cameras)

            time.sleep(2)  # cada 2s revisa cambios


    # ------------------------------------------------------------
    # Punto de entrada
    # ------------------------------------------------------------
    def start(self):
        logging.info("Iniciando CameraManager...")
        self.running = True

        cameras, file_hash = self._load_camera_file()
        if not cameras:
            logging.error("No se pudo leer cameras.yml")
            return

        self.last_file_hash = file_hash
        self._apply_camera_changes(cameras)

        # Thread que observa cambios del archivo
        self.watch_thread = Thread(target=self._watch_cameras, daemon=True)
        self.watch_thread.start()


    def stop(self):
        logging.info("Deteniendo CameraManager...")
        self.running = False

        with self.lock:
            for cam_id in list(self.workers.keys()):
                self._stop_camera(cam_id)
