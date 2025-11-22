# insightface_service/database/acceso.py
import json
import logging
import os
from datetime import datetime
from dotenv import load_dotenv
from .db import Database, get_db

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".env")
load_dotenv(ENV_PATH)

class AccesoDB:
    def __init__(self, db: Database):
        self.db = db

    def registrar_acceso(self, usuario_id, camara_id, similarity, perfil, img, embedding):
        """
        Registra un acceso. Si el usuario es desconocido (-1), crea un usuario y lo usa.
        """
        logging.info("registrar_acceso ------ usuario_id=%s", usuario_id)
        with self.db.cursor() as cur:
            if usuario_id == -1:
                usuario_id = self._crear_usuario_desconocido(cur)

            if usuario_id == "null":
                return
            
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
                json.dumps(embedding.tolist() if hasattr(embedding, "tolist") else embedding),
            )

            cur.execute(sql, params)

    def _crear_usuario_desconocido(self, cur):
        """
        Inserta un usuario desconocido y devuelve su ID.
        """
        logging.info("_crear_usuario_desconocido new()")
        try:
            sql = """
            INSERT INTO usuario (nombre, tipo, estado, password_bcryptjs, local_id, google)
            VALUES (%s, %s, %s)
            """
            params = ("Desconocido", "desconocido", "activo", "1", "2", "0")
            cur.execute(sql, params)
            user_id = cur.lastrowid
            logging.info("Usuario desconocido creado usuario_id=%s", user_id)
            return user_id
        

            # except Exception as e:
            #     # Get the exception message as a string
            #     error_message = str(e)
            #     print(f"Caught exception message: {error_message}")

        except (json.JSONDecodeError, TypeError) as e:
            logging.warning(f"error _crear_usuario_desconocido usuario Desconocido: {e}")
            return 'null'

# ----------------------------------------------------------------------
#   FUNCIÓN COMPATIBLE CON RecognitionService
# ----------------------------------------------------------------------

def DB_InsertAcceso(usuario_id, camara_id, similarity, embedding, perfil="rostro", img=None):
    """
    Función de compatibilidad usada por RecognitionService.
    Permite registrar accesos sin usar directamente la clase AccesoDB.
    """
    acceso_db = AccesoDB(get_db())
    acceso_db.registrar_acceso(
        usuario_id=usuario_id,
        camara_id=camara_id,
        similarity=similarity,
        perfil=perfil,
        img=img,
        embedding=embedding
    )
