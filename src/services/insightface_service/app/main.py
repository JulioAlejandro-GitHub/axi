# app/main.py

import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from .database.db import Database as DB
from .recognition import RecognitionService


app = FastAPI()

recognizer: RecognitionService = None


@app.on_event("startup")
async def startup_event():
    global recognizer

    db = DB()
    await db.connect()

    recognizer = RecognitionService(db)
    await recognizer.load_embeddings()


@app.post("/recognize")
async def recognize(file: UploadFile = File(...), camera_id: int = Form(None)):
    img_bytes = await file.read()
    return recognizer.recognize(img_bytes)


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8010)
