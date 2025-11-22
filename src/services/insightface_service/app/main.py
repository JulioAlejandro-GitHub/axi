# app/main.py

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from .recognition import RecognitionService
from ..database.db import Database

from dotenv import load_dotenv
import os

# Cargar variables desde .env
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".env")
load_dotenv(ENV_PATH)

app = FastAPI()

frontend_urls = os.getenv(
    "FRONTEND_URLS",
    "http://localhost:8085,http://127.0.0.1:8085,http://localhost:3000",
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

recognizer: RecognitionService = None
db: Database = None


@app.on_event("startup")
async def startup_event():
    global recognizer, db

    # Inicializar DB con las claves correctas del constructor
    db = Database({
        "db_host": os.getenv("db_host"),
        "db_port": int(os.getenv("db_port", 3306)),
        "db_user": os.getenv("db_user"),
        "db_password": os.getenv("db_password"),
        "db_database": os.getenv("db_database"),
    })

    # Inicializar el reconocimiento (no recibe DB)
    recognizer = RecognitionService()

    print("✔ Base de datos inicializada")
    print("✔ Servicio de reconocimiento iniciado")


@app.post("/recognize")
async def recognize(file: UploadFile = File(...), camera_id: int = Form(None)):
    img_bytes = await file.read()
    return recognizer.recognize(img_bytes, camera_id)


if __name__ == "__main__":
    uvicorn.run("insightface_service.app.main:app", host="0.0.0.0", port=8010)
