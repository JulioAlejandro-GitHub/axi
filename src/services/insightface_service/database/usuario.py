# insightface_service/database/usuario.py
import json
import os
import uuid
from sqlalchemy import select, insert
from .db import get_db_connection
from src.services.database.models import usuario

class UsuarioDB:
    def get_all_embeddings(self, local_id=None):
        query = select(
            usuario.c.usuario_id,
            usuario.c.nombre,
            usuario.c.tipo,
            usuario.c.local_id,
            usuario.c.embedding
        ).where(
            usuario.c.estado == 'activo',
            usuario.c.embedding.isnot(None)
        )

        if local_id:
            query = query.where(usuario.c.local_id == local_id)

        with get_db_connection() as conn:
            result = conn.execute(query).fetchall()

        # convertir JSON → vector float32
        for r in result:
            if r.embedding:
                r.embedding = json.loads(r.embedding)

        return result

    def crear_usuario_desconocido(self):
        """
        Inserta un usuario desconocido y devuelve su ID.
        """
        default_local_id = os.getenv("DEFAULT_UNKNOWN_USER_LOCAL_ID", 1)

        query = insert(usuario).values(
            nombre="Desconocido",
            tipo="desconocido",
            estado="activo",
            # TODO: Se debe implementar un método seguro para la generación de contraseñas.
            password_bcryptjs="1",
            local_id=default_local_id,
            google="0",
            email=f"unknown_{uuid.uuid4()}@example.com"
        )
        with get_db_connection() as conn:
            result = conn.execute(query)
            return result.inserted_primary_key[0]
