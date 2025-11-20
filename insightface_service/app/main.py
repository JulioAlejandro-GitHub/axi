from fastapi import FastAPI, File, UploadFile, HTTPException
from .recognition import insight_face_service
from . import matcher
import logging

app = FastAPI(
    title="InsightFace Recognition Service",
    description="Una API para acceder a las capacidades de reconocimiento facial de InsightFace.",
    version="1.0.0"
)

@app.post("/recognize")
async def recognize_faces(image: UploadFile = File(...)):
    print("recognize_faces")
    """
    Endpoint para reconocer caras en una imagen.
    Recibe un archivo de imagen y devuelve los datos faciales detectados.
    """
    # Validar que el archivo sea una imagen
    if not image.content_type.startswith("image/"):
        print("El archivo debe ser una imagen")
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    try:
        # Leer el contenido del archivo
        image_bytes = await image.read()

        # Procesar la imagen con el servicio
        print("Procesar la imagen con el servicio")
        results = insight_face_service.process_image(image_bytes)

        if "error" in results:
            raise HTTPException(status_code=400, detail=results["error"])

        return results
    except Exception as e:
        print("Manejo de errores inesperados")
        # Manejo de errores inesperados
        raise HTTPException(status_code=500, detail=f"Ocurrió un error interno: {str(e)}")

@app.get("/health")
def health_check():
    """Endpoint para verificar que el servicio está activo."""
    return {"status": "ok"}

@app.post("/recognize_user")
async def recognize_user_endpoint(image: UploadFile = File(...)):
    """
    Endpoint para reconocer a un usuario comparando su rostro con la base de datos.
    """
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen.")

    try:
        image_bytes = await image.read()
        
        # 1. Obtener el embedding de la cara en la imagen
        logging.info("Extrayendo embedding de la imagen de entrada...")
        results = insight_face_service.process_image(image_bytes)

        if "error" in results or not results.get("result"):
            return {"match": None, "message": "No se detectaron rostros en la imagen."}
        
        # Usar el embedding de la cara más grande/primera
        input_embedding = results["result"][0]["embedding"]

        # 2. Obtener los rostros conocidos de la BD
        logging.info("Consultando la base de datos de rostros conocidos...")
        known_faces = matcher.get_known_faces_from_db()
        if not known_faces:
            raise HTTPException(status_code=500, detail="No se pudieron cargar los rostros de la base de datos.")

        # 3. Encontrar la mejor coincidencia
        logging.info("Buscando la mejor coincidencia...")
        match, similarity = matcher.find_best_match(input_embedding, known_faces)
        
        if match:
            return {
                "match": "found",
                "user_info": match,
                "similarity": float(similarity)
            }
        else:
            return {
                "match": "not_found",
                "message": "No se encontró ninguna coincidencia.",
                "highest_similarity": float(similarity)
            }

    except Exception as e:
        logging.error(f"Error en el endpoint /recognize_user: {e}")
        raise HTTPException(status_code=500, detail=f"Ocurrió un error interno: {str(e)}")
