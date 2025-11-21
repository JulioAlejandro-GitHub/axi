# insightface_service/database/acceso.py
import json
from datetime import datetime
from .db import Database

class AccesoDB:
    def __init__(self, db: Database):
        self.db = db

    def registrar_acceso(self, usuario_id, camara_id, similarity, perfil, img, embedding):
        sql = """
        INSERT INTO acceso (
            usuario_id, camara_id, fecha_acceso, tipo, estado,
            similarity, perfil, img, embedding
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        params = (
            usuario_id,
            camara_id,
            datetime.now(),
            "identificado" if usuario_id != -1 else "desconocido",
            "por_validar",
            similarity,
            perfil,
            img,
            json.dumps(embedding.tolist() if hasattr(embedding,"tolist") else embedding),
        )

        self.db.execute(sql, params)
