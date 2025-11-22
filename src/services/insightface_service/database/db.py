# src/services/insightface_service/database/db.py
from src.services.database.connection import get_engine
from src.services.database.models import (
    acceso,
    camara,
    empresa,
    login,
    sucursal,
    usuario,
)

engine = get_engine()

def get_db_connection():
    return engine.connect()
