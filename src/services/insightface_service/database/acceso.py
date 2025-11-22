# insightface_service/database/acceso.py
import json
import logging
from datetime import datetime
from sqlalchemy import insert
from .db import get_db_connection
from src.services.database.models import acceso
from .usuario import UsuarioDB

class AccesoDB:
    def registrar_acceso(self, usuario_id, camara_id, similarity, perfil, img, embedding):
        """
        Registra un acceso. Si el usuario es desconocido (-1), crea un usuario y lo usa.
        """
        logging.info("registrar_acceso ------ usuario_id=%s", usuario_id)
        
        if usuario_id == -1:
            usuario_db = UsuarioDB()
            usuario_id = usuario_db.crear_usuario_desconocido()

        if usuario_id is None or usuario_id == "null":
            return

        query = insert(acceso).values(
            usuario_id=usuario_id,
            camara_id=camara_id,
            fecha_acceso=datetime.now(),
            tipo="identificado" if usuario_id != -1 else "desconocido",
            estado="por_validar",
            similarity=similarity,
            perfil=perfil,
            img=img,
            embedding=json.dumps(embedding.tolist() if hasattr(embedding, "tolist") else embedding),
        )

        with get_db_connection() as conn:
            conn.execute(query)

# ----------------------------------------------------------------------
#   FUNCIÓN COMPATIBLE CON RecognitionService
# ----------------------------------------------------------------------

def DB_InsertAcceso(usuario_id, camara_id, similarity, embedding, perfil="rostro", img=None):
    """
    Función de compatibilidad usada por RecognitionService.
    Permite registrar accesos sin usar directamente la clase AccesoDB.
    """
    acceso_db = AccesoDB()
    acceso_db.registrar_acceso(
        usuario_id=usuario_id,
        camara_id=camara_id,
        similarity=similarity,
        perfil=perfil,
        img=img,
        embedding=embedding
    )
