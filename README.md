
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