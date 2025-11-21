#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script de Reconocimiento Facial
Este script compara una imagen de entrada con una base de datos de rostros conocidos
y devuelve la identidad de la persona si encuentra una coincidencia.

Instalación de dependencias:
pip install mysql-connector-python python-dotenv numpy opencv-python
"""

import os
import mysql.connector
from dotenv import load_dotenv
import json
import logging

# Configuración básica de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Cargar variables de entorno desde el archivo .env
load_dotenv()

def get_database_connection():
    """Establece y devuelve una conexión a la base de datos."""
    try:
        connection = mysql.connector.connect(
            host=os.getenv('db_host'),
            user=os.getenv('db_user'),
            password=os.getenv('db_password'),
            database=os.getenv('db_database')
        )
        if connection.is_connected():
            logging.info("Conexión a la base de datos establecida con éxito.")
            return connection
    except mysql.connector.Error as e:
        logging.error(f"Error al conectar a la base de datos: {e}")
        return None

def get_known_faces_from_db():
    """
    Obtiene los embeddings y datos de los usuarios registrados desde la base de datos.
    Replica la lógica de la función BD_GetFacesForHumanMatcher.
    """
    connection = get_database_connection()
    if not connection:
        return []

    known_faces = []
    try:
        cursor = connection.cursor(dictionary=True)
        sql = """
            SELECT
                a.acceso_id,
                a.img,
                a.usuario_id,
                a.embedding,
                u.nombre,
                u.tipo AS usuario_tipo
            FROM acceso a
            INNER JOIN usuario u ON u.usuario_id = a.usuario_id
            WHERE
                u.fecha_eliminacion IS NULL
                AND u.estado = 'activo'
                AND a.fecha_eliminacion IS NULL
                AND a.img IS NOT NULL
                AND a.embedding IS NOT NULL
        """
        cursor.execute(sql)
        rows = cursor.fetchall()

        for row in rows:
            try:
                # El embedding se almacena como un string JSON, necesita ser decodificado
                embedding_str = row['embedding']
                if isinstance(embedding_str, (bytes, bytearray)):
                    embedding_str = embedding_str.decode('utf-8')

                embedding = json.loads(embedding_str)

                known_faces.append({
                    "usuario_id": row['usuario_id'],
                    "nombre": row['nombre'],
                    "usuario_tipo": row['usuario_tipo'],
                    "embedding": embedding
                })
            except (json.JSONDecodeError, TypeError) as e:
                logging.warning(f"No se pudo decodificar el embedding para acceso_id {row.get('acceso_id')}: {e}")

        logging.info(f"Se cargaron {len(known_faces)} rostros conocidos desde la base de datos.")
        return known_faces
    except mysql.connector.Error as e:
        logging.error(f"Error al ejecutar la consulta SQL: {e}")
        return []
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            logging.info("Conexión a la base de datos cerrada.")

import cv2
import numpy as np
from insightface.app import FaceAnalysis

class InsightFaceService:
    def __init__(self, model_pack_name='buffalo_l'):
        """
        Inicializa el modelo de análisis facial.
        """
        self.face_analysis = FaceAnalysis(name=model_pack_name)
        self.face_analysis.prepare(ctx_id=0, det_size=(640, 640))

    def get_embedding(self, image_path):
        """
        Procesa una imagen para detectar una cara y extraer su embedding.
        Devuelve solo el embedding de la cara más grande si hay varias.
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                logging.error(f"No se pudo leer la imagen en la ruta: {image_path}")
                return None

            faces = self.face_analysis.get(img)
            if not faces:
                logging.warning("No se detectaron rostros en la imagen.")
                return None

            # Encontrar la cara con el bounding box más grande
            largest_face = max(faces, key=lambda face: (face.bbox[2] - face.bbox[0]) * (face.bbox[3] - face.bbox[1]))

            logging.info("Embedding extraído con éxito.")
            return largest_face.embedding
        except Exception as e:
            logging.error(f"Ocurrió un error al procesar la imagen con InsightFace: {e}")
            return None

def cosine_similarity(embedding1, embedding2):
    """Calcula la similitud del coseno entre dos embeddings."""
    embedding1 = np.asarray(embedding1)
    embedding2 = np.asarray(embedding2)
    dot_product = np.dot(embedding1, embedding2)
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    similarity = dot_product / (norm1 * norm2)
    return similarity

def find_best_match(input_embedding, known_faces, threshold=0.5):
    """
    Encuentra la mejor coincidencia para un embedding de entrada en una lista de rostros conocidos.
    """
    best_match = None
    highest_similarity = -1

    if input_embedding is None:
        logging.warning("El embedding de entrada es nulo, no se puede buscar una coincidencia.")
        return None, highest_similarity

    for face in known_faces:
        similarity = cosine_similarity(input_embedding, face['embedding'])
        if similarity > highest_similarity:
            highest_similarity = similarity
            best_match = face

    if highest_similarity >= threshold:
        logging.info(f"Coincidencia encontrada: {best_match['nombre']} con una similitud de {highest_similarity:.4f}")
        return best_match, highest_similarity
    else:
        logging.info(f"No se encontró ninguna coincidencia por encima del umbral. Similitud más alta: {highest_similarity:.4f}")
        return None, highest_similarity

import argparse

def recognize_face(image_path):
    """
    Función principal que orquesta el proceso de reconocimiento facial.
    """
    # 1. Cargar los rostros conocidos desde la base de datos
    known_faces = get_known_faces_from_db()
    if not known_faces:
        logging.error("No hay rostros cargados desde la base de datos. El proceso no puede continuar.")
        return

    # 2. Inicializar el servicio de InsightFace y obtener el embedding de la imagen de entrada
    logging.info("Inicializando InsightFace Service...")
    insight_service = InsightFaceService()
    logging.info(f"Procesando la imagen de entrada: {image_path}")
    input_embedding = insight_service.get_embedding(image_path)

    if input_embedding is None:
        logging.error("No se pudo obtener el embedding de la imagen de entrada. Terminando.")
        return

    # 3. Encontrar la mejor coincidencia
    logging.info("Buscando la mejor coincidencia...")
    match, similarity = find_best_match(input_embedding, known_faces)

    # 4. Mostrar los resultados
    print("\n----- RESULTADO DEL RECONOCIMIENTO -----")
    if match:
        print(f"Coincidencia encontrada:")
        print(f"  - ID de Usuario: {match['usuario_id']}")
        print(f"  - Nombre: {match['nombre']}")
        print(f"  - Tipo: {match['usuario_tipo']}")
        print(f"  - Similitud: {similarity:.4f}")
    else:
        print("No se encontró ninguna coincidencia en la base de datos.")
    print("----------------------------------------")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Reconocimiento facial de una imagen de entrada.")
    parser.add_argument("image_path", help="La ruta completa a la imagen que se va a analizar.")

    args = parser.parse_args()

    if not os.path.exists(args.image_path):
        logging.error(f"El archivo especificado no existe: {args.image_path}")
    else:
        recognize_face(args.image_path)
