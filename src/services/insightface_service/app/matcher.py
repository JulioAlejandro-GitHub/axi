# insightface_service/app/matcher.py

import os
import mysql.connector
from dotenv import load_dotenv
import json
import logging
import numpy as np

# Configuración básica de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

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
            return connection
    except mysql.connector.Error as e:
        logging.error(f"Error al conectar a la base de datos: {e}")
        return None

def get_known_faces_from_db():
    """
    Obtiene los embeddings y datos de los usuarios registrados desde la base de datos.
    """
    connection = get_database_connection()
    if not connection:
        return []

    known_faces = []
    try:
        cursor = connection.cursor(dictionary=True)
        sql = """
            SELECT
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
                AND a.embedding IS NOT NULL
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        for row in rows:
            try:
                embedding_str = row['embedding']
                if isinstance(embedding_str, (bytes, bytearray)):
                    embedding_str = embedding_str.decode('utf-8')
                
                embedding = json.loads(embedding_str)

                known_faces.append({
                    "usuario_id": row['usuario_id'],
                    "nombre": row['nombre'],
                    "usuario_tipo": row['usuario_tipo'],
                    "embedding": np.array(embedding) # Convertir a array de numpy para cálculo
                })
            except (json.JSONDecodeError, TypeError) as e:
                logging.warning(f"No se pudo decodificar el embedding para el usuario {row.get('usuario_id')}: {e}")

        logging.info(f"Se cargaron {len(known_faces)} rostros conocidos desde la base de datos.")
        return known_faces
    except mysql.connector.Error as e:
        logging.error(f"Error al ejecutar la consulta SQL: {e}")
        return []
    finally:
        if connection and connection.is_connected():
            cursor.close()
            connection.close()

def cosine_similarity(embedding1, embedding2):
    """Calcula la similitud del coseno entre dos embeddings de numpy."""
    dot_product = np.dot(embedding1, embedding2)
    norm1 = np.linalg.norm(embedding1)
    norm2 = np.linalg.norm(embedding2)
    similarity = dot_product / (norm1 * norm2)
    return similarity

def find_best_match(input_embedding, known_faces, threshold=0.5):
    """
    Encuentra la mejor coincidencia para un embedding de entrada en una lista de rostros conocidos.
    """
    best_match_info = None
    highest_similarity = -1

    if input_embedding is None:
        return None, highest_similarity

    # Normalizar el embedding de entrada una sola vez
    input_embedding_np = np.asarray(input_embedding)

    for face in known_faces:
        similarity = cosine_similarity(input_embedding_np, face['embedding'])
        if similarity > highest_similarity:
            highest_similarity = similarity
            best_match_info = {
                "usuario_id": face['usuario_id'],
                "nombre": face['nombre'],
                "usuario_tipo": face['usuario_tipo']
            }

    if highest_similarity >= threshold:
        logging.info(f"Coincidencia encontrada: {best_match_info['nombre']} con una similitud de {highest_similarity:.4f}")
        return best_match_info, highest_similarity
    
    return None, highest_similarity

def match_embeddings(input_embedding, known_faces, threshold=0.5):
    """
    Alias de compatibilidad para find_best_match().
    Se mantiene para hacer funcionar el servicio que importa match_embeddings.
    """
    return find_best_match(input_embedding, known_faces, threshold)
