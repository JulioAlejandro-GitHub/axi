# src/services/insightface_service/app/recognition.py

import hashlib
import logging
import os
import time
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from ..database.acceso import DB_InsertAcceso
from .matcher import (
    get_known_faces_from_db,
    match_embeddings
)


class RecognitionService:

    def __init__(self):
        logging.info("[RecognitionService] Inicializando modelo InsightFace…")
        self.model = FaceAnalysis(name="buffalo_l")
        self.model.prepare(ctx_id=0, det_size=(640, 640))

        logging.info("[RecognitionService] Cargando embeddings desde la BD…")
        self.known_faces = get_known_faces_from_db()
        logging.info(f"[RecognitionService] {len(self.known_faces)} embeddings cargados.")

        # Anti-spam: evita registrar repetidamente a la misma persona en ventana de tiempo
        self.cooldown_ms = int(os.getenv("RECOGNITION_COOLDOWN_MS", "60000"))  # default 60s
        self.last_seen = {}  # clave -> timestamp ms

    # ----------------------------------------------------------------------
    #   PROCESO PRINCIPAL
    # ----------------------------------------------------------------------

    def recognize(self, image_bytes, camera_id=None):
        logging.info("recognize ----")
        image_path = self._save_image(image_bytes, camera_id)

        # ---- DECODIFICAR IMAGEN ----
        img_np = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)

        if img_np is None:
            raise ValueError("No se pudo decodificar la imagen enviada")

        # ---- DETECTAR ROSTROS ----
        faces = self.model.get(img_np)

        personasIdentificadas = []
        personasDesconocidas = []
        matchFaces = []

        for i, face in enumerate(faces):
            box = face.bbox.astype(int).tolist()
            embedding = face.embedding

            # Matching usando matcher.py
            best_user, similarity = match_embeddings(
                embedding,
                self.known_faces,
                threshold=0.38   # recomendado para buffalo_l
            )
            similarity_value = max(float(similarity), 0.0) if similarity is not None else 0.0

            matchFaces.append({
                "similarity": similarity_value,
                "usuario_id": best_user["usuario_id"] if best_user else None,
                "embedding": embedding.tolist(),
                "box": box,
                "fuente": ["insightface"]
            })

            if best_user:
                if self._recently_seen(best_user["usuario_id"], camera_id):
                    logging.info("[RecognitionService] Usuario %s ya visto en ventana de cooldown. Se omite registro.", best_user["usuario_id"])
                    continue

                self._mark_seen(best_user["usuario_id"], camera_id)
                personasIdentificadas.append({
                    "similarity": similarity_value,
                    "usuario_tipo": best_user["usuario_tipo"],
                    "nombre": best_user["nombre"],
                    "usuario_id": best_user["usuario_id"],
                    "embedding": embedding.tolist(),
                    "box": box,
                    "img": None,
                    "fuente": ["insightface"]
                })

                DB_InsertAcceso(
                    usuario_id=best_user["usuario_id"],
                    camara_id=camera_id,
                    similarity=round(similarity_value, 3),
                    embedding=embedding.tolist(),
                    img=image_path
                )

            else:
                unknown_key = self._unknown_key(embedding, camera_id)
                if self._recently_seen(unknown_key, camera_id):
                    logging.info("[RecognitionService] Desconocido similar ya visto en ventana de cooldown. Se omite registro.")
                    continue

                self._mark_seen(unknown_key, camera_id)
                DB_InsertAcceso(
                    usuario_id=-1,
                    camara_id=camera_id,
                    similarity=round(similarity_value, 3),
                    embedding=embedding.tolist(),
                    img=image_path
                )

                personasDesconocidas.append({
                    "similarity": similarity_value,
                    "usuario_tipo": "desconocido",
                    "nombre": "nuevo Acceso",
                    "usuario_id": f"desconocido_{i}",
                    "embedding": embedding.tolist(),
                    "box": box,
                    "img": None,
                    "fuente": ["insightface"]
                })

        return {
            "personasDetectadas": len(faces),
            "personasIdentificadas": personasIdentificadas,
            "personasDesconocidas": personasDesconocidas,
            "matchFaces": matchFaces,
            "imgOriginal": None
        }

    # ----------------------------------------------------------------------
    #   UTILIDAD: GUARDAR IMAGEN ORIGINAL
    # ----------------------------------------------------------------------
    def _save_image(self, image_bytes, camera_id=None):
        """
        Persiste la imagen completa procesada en frontend/public/uploads/faces
        y devuelve la ruta absoluta.
        """
        base_dir = Path("/Users/julio/Documents/GitHub/axi/frontend/public/uploads/faces")
        base_dir.mkdir(parents=True, exist_ok=True)

        ts = datetime.utcnow().strftime("%Y%m%dT%H%M%S%fZ")
        cam_prefix = f"InsightFace_Cam{camera_id}_" if camera_id is not None else ""
        filename = f"{cam_prefix}{ts}.jpg"
        file_path = base_dir / filename

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        logging.info(f"[RecognitionService] Imagen guardada en {file_path}")
        return str(file_path)

    # ----------------------------------------------------------------------
    #   UTILIDADES DE DEDUPLICACIÓN
    # ----------------------------------------------------------------------
    def _recently_seen(self, key, camera_id):
        now = int(time.time() * 1000)
        last = self.last_seen.get((camera_id, key))
        return last is not None and (now - last) < self.cooldown_ms

    def _mark_seen(self, key, camera_id):
        self.last_seen[(camera_id, key)] = int(time.time() * 1000)

    def _unknown_key(self, embedding, camera_id):
        """
        Crea una clave estable para desconocidos usando el embedding y la cámara.
        """
        emb_bytes = np.asarray(embedding, dtype=np.float32).tobytes()
        digest = hashlib.sha1(emb_bytes).hexdigest()[:12]
        return f"unk:{camera_id}:{digest}"
