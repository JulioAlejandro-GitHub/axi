# src/services/insightface_service/app/recognition.py

import logging
from insightface.app import FaceAnalysis
from ..database.acceso import DB_InsertAcceso
from datetime import datetime
import cv2
import numpy as np

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

    # ----------------------------------------------------------------------
    #   PROCESO PRINCIPAL
    # ----------------------------------------------------------------------

    def recognize(self, image_bytes, camera_id=None):

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

            matchFaces.append({
                "similarity": float(similarity),
                "usuario_id": best_user["usuario_id"] if best_user else None,
                "embedding": embedding.tolist(),
                "box": box,
                "fuente": ["insightface"]
            })

            if best_user:
                personasIdentificadas.append({
                    "similarity": float(similarity),
                    "usuario_tipo": best_user["usuario_tipo"],
                    "nombre": best_user["nombre"],
                    "usuario_id": best_user["usuario_id"],
                    "embedding": embedding.tolist(),
                    "box": box,
                    "img": None,
                    "fuente": ["insightface"]
                })

                # Registrar acceso
                DB_InsertAcceso(
                    usuario_id=best_user["usuario_id"],
                    camara_id=camera_id,
                    similarity=round(float(similarity), 3),
                    embedding=embedding.tolist()
                )

            else:
                personasDesconocidas.append({
                    "similarity": float(similarity),
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
