import cv2
import numpy as np
from insightface.app import FaceAnalysis
import logging

class InsightFaceService:
    def __init__(self, model_pack_name='buffalo_l'):
        logging.info("__init__ model_pack_name buffalo_l ")
        """
        Inicializa el modelo de análisis facial.
        Compatible con InsightFace 0.7.3 (Mac ARM64).
        """
        self.face_analysis = FaceAnalysis(name=model_pack_name)

        # IMPORTANTE:
        # InsightFace 0.7.3 NO soporta providers=
        self.face_analysis.prepare(
            ctx_id=0,
            det_size=(640, 640)
        )

    def process_image(self, image_bytes: bytes):
        print("process_image")

        """
        Procesa una imagen para detectar caras y extraer características.
        """
        # Decodificar los bytes → imagen OpenCV
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            print("No se pudo decodificar la imagen.")
            return {"error": "No se pudo decodificar la imagen."}

        # Detectar caras
        faces = self.face_analysis.get(img)

        results = []
        for face in faces:
            print("face")
            print(face.bbox.astype(int).tolist())
            results.append({
                "box": face.bbox.astype(int).tolist(),
                "confidence": float(face.det_score),
                "embedding": face.embedding.astype(float).tolist(),  # embedding correcto en 0.7.3
                "landmarks": face.kps.astype(int).tolist()
            })

        return {"result": results}

# Instancia singleton
insight_face_service = InsightFaceService()
