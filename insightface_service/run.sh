#!/bin/bash

# -------------------------------------------------------
# run.sh – Start InsightFace API (macOS ARM)
# Auto-install requirements if needed
# con instalación automática de requirements.txt
# ▶ Ejecutar el servicio
#       ./run.sh
#   con otro puerto: ./run.sh 8020
# -------------------------------------------------------

PORT=${1:-8010}
VENV_DIR="./venv"
REQ_FILE="./requirements.txt"

echo "🚀 Starting InsightFace Service on port $PORT"
echo "📌 Working dir: $(pwd)"
echo ""

# ---- 1) Check Python ----
PY=$(which python3)
echo "🐍 Using Python: $PY"

# ---- 2) Create venv if missing ----
if [ ! -d "$VENV_DIR" ]; then
    echo "⚠️ Virtualenv not found — creating one..."
    python3 -m venv venv
fi

# ---- 3) Activate venv ----
echo "🔧 Activating virtual environment..."
source "$VENV_DIR/bin/activate"

# ---- 4) Check requirements.txt ----
if [ ! -f "$REQ_FILE" ]; then
    echo "❌ ERROR: Missing requirements.txt at: $REQ_FILE"
    exit 1
fi

echo "📦 Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r "$REQ_FILE"

# ---- 5) Quick InsightFace check ----
echo "🔍 Verifying InsightFace installation..."
python3 - << 'EOF'
try:
    import insightface
    from insightface.app import FaceAnalysis
    print("✅ InsightFace loaded correctly.")
except Exception as e:
    print("❌ InsightFace failed to load:")
    print(e)
    exit(1)
EOF

# ---- 6) Run API ----
echo "🚀 Launching Uvicorn server on port $PORT..."
uvicorn app.main:app --host 0.0.0.0 --port "$PORT" --reload
