# insightface_service/database/camera.py
from sqlalchemy import select
from .db import get_db_connection
from src.services.database.models import camara

class CameraDB:
    def get_active_cameras(self):
        query = select(
            camara.c.camara_id,
            camara.c.nombre,
            camara.c.ubicacion,
            camara.c.camara_hostname,
            camara.c.camara_port,
            camara.c.camara_user,
            camara.c.camara_pass,
            camara.c.protocolo
        ).where(
            camara.c.estado == 'Activo'
        ).order_by(
            camara.c.orden.asc()
        )
        with get_db_connection() as conn:
            return conn.execute(query).fetchall()
