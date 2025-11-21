#!/bin/bash

echo "🚀 Iniciando InsightFace Service..."
bash src/services/insightface_service/run.sh &

echo "📡 Iniciando Camera Streaming Service..."
bash src/services/cam_streaming/run.sh &

wait
