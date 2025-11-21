from fastapi import FastAPI, UploadFile, File
from recognition import RecognitionService

app = FastAPI()
recognizer = RecognitionService()

@app.post("/recognize")
async def recognize(file: UploadFile = File(...)):
    image_bytes = await file.read()
    result = recognizer.process(image_bytes)
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
