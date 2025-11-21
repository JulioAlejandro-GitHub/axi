# insightface_service/database/camera.py
from .db import Database

class CameraDB:
    def __init__(self, db: Database):
        self.db = db

    def get_active_cameras(self):
        sql = """
        SELECT camara_id, nombre, ubicacion, camara_hostname, camara_port,
               camara_user, camara_pass, protocolo
        FROM camara
        WHERE estado = 'Activo'
        ORDER BY orden ASC;
        """
        return self.db.query(sql)
