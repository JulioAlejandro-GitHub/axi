import numpy as np
from insightface.app import FaceAnalysis
from PIL import Image
import io


class RecognitionService:
    def __init__(self):
        # Cargar FaceAnalysis completo (detección + landmarks + embedding)
        self.app = FaceAnalysis(name="buffalo_l")
        self.app.prepare(ctx_id=0, det_size=(640, 640))

    def _bytes_to_rgb(self, img_bytes):
        return np.array(Image.open(io.BytesIO(img_bytes)).convert("RGB"))

    def process(self, image_bytes):
        """
        Procesa una imagen y devuelve detecciones y embeddings con InsightFace.
        """
        img = self._bytes_to_rgb(image_bytes)

        faces = self.app.get(img)

        result = {
            "num_faces": len(faces),
            "faces": []
        }

        for f in faces:
            face_info = {
                "bbox": f.bbox.astype(int).tolist(),
                "kps": f.kps.tolist(),
                "embedding": f.embedding.tolist(),   # embedding válido
                "gender": int(f.gender),
                "age": int(f.age)
            }
            result["faces"].append(face_info)

        return result
