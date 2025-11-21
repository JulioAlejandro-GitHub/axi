# insightface_service/database/usuario.py
import json
from .db import Database

class UsuarioDB:
    def __init__(self, db: Database):
        self.db = db

    def get_all_embeddings(self, local_id=None):
        sql = """
        SELECT usuario_id, nombre, tipo, local_id, embedding
        FROM usuario
        WHERE estado = 'activo'
          AND embedding IS NOT NULL
        """
        params = []

        if local_id:
            sql += " AND local_id = %s"
            params.append(local_id)

        rows = self.db.query(sql, params)

        # convertir JSON → vector float32
        for r in rows:
            if r["embedding"]:
                r["embedding"] = json.loads(r["embedding"])

        return rows
