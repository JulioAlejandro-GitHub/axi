
# Vigilante SW - Computer Vision System

## Installation 

Use the package manager [npm](https://www.npmjs.com/) to install.

### Backend
```bash
npm install
```

## Usage Backend
```bash
npm start
```

### Frontend
```bash
cd frontend/
npm install
```

## Usage Frontend
```bash
cd frontend/
npm start
```
---
## FrontEnd
http://localhost:3000

## BackEnd
http://localhost:8085



## License
- CompreFace
- Human
- DeepFace
- InsightFace
- Roboflow
- Node
- Python
- Mysql




# Python Entorno Virtual MAC ARM64
```bash
cd insightface_service/

brew install python@3.10

./setup.sh
./run.sh
```
<!-- 
start servise Python
uvicorn app.main:app --host 0.0.0.0 --port 8010 


### iniciar servicio InsightFace

cd insightface_service/
colima start --arch x86_64 --vz-rosetta --cpu 4 --memory 8
docker compose up -d



### iniciar servicio CompreFace

cd CompreFace/

colima start --arch aarch64 --memory 4 --cpu 4
colima start --arch aarch64 --memory 8 --cpu 6
    No uses --gpu porque CompreFace no usa aceleración Metal.

docker compose up -d
-->



🧪 Crear entorno virtual del servicio InsightFace:
cd insightface_service
python3 -m venv venv_insight
source venv_insight/bin/activate
pip install -r requirements.txt

▶️ run.sh del servicio InsightFace:
#!/bin/bash
cd "$(dirname "$0")"
source venv_insight/bin/activate
python3 main.py


🧪 Crear entorno virtual: cam_streaming
cd cam_streaming
python3 -m venv venv_stream
source venv_stream/bin/activate
pip install -r requirements.txt

▶️ run.sh del servicio de streaming:
#!/bin/bash
cd "$(dirname "$0")"
source venv_stream/bin/activate
python3 camera_stream/main.py






Crear el venv Python

Ve al directorio correcto:
cd /Users/julio/Documents/GitHub/axi/src/services/insightface_service

Crear venv:
python3 -m venv venv_insight

Activarlo:
source venv_insight/bin/activate

Confirmar:
which python




Instalar dependencias del InsightFace Service
pip install --upgrade pip
pip install -r requirements.txt


Borrar caché del proyecto (importante)
find . -type d -name "__pycache__" -exec rm -r {} +



Ejecutar InsightFace Service
python -m app.main


Dale permiso:
chmod +x run.sh