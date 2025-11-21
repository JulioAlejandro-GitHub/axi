# app/recognition.py

import insightface
from insightface.app import FaceAnalysis
from .matcher import match_embeddings
from .database.usuario import DB_GetAllUsersEmbeddings


class RecognitionService:
    def __init__(self, db):
        self.db = db

        # inicializar el modelo de InsightFace
        self.model = FaceAnalysis(name="buffalo_l")
        self.model.prepare(ctx_id=0)

        # cache de embeddings
        self.users = []

    async def load_embeddings(self):
        """
        Leer todos los usuarios y sus embeddings desde la BD al iniciar.
        """
        print("🔵 Cargando embeddings desde base de datos…")

        rows = await DB_GetAllUsersEmbeddings(self.db)

        self.users = [
            {
                "usuario_id": r["usuario_id"],
                "nombre": r["nombre"],
                "embedding": eval(r["embedding"])  # en tu BD está como texto
            }
            for r in rows
        ]

        print(f"🔵 {len(self.users)} embeddings cargados")

    def recognize(self, image_bytes):
        """
        Procesar imagen y encontrar a la persona más cercana.
        """
        faces = self.model.get(image_bytes)
        if not faces:
            return {"num_faces": 0, "match": None}

        face = faces[0]
        emb = face.embedding.tolist()

        match = match_embeddings(emb, self.users)
        return {
            "num_faces": 1,
            "match": match,
            "face_info": {
                "bbox": face.bbox.tolist(),
                "gender": face.gender,
                "age": face.age
            }
        }
