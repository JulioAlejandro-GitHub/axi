#!/bin/bash

# -------------------------------------------------------
# setup.sh – Full clean installation (macOS ARM)
# -------------------------------------------------------

echo "🐍 Setting up InsightFace environment for macOS ARM..."
echo "📁 Working directory: $(pwd)"
echo ""

VENV_DIR="./venv"
REQ_FILE="./requirements.txt"

# ---- 1) Remove old venv (optional) ----
if [ -d "$VENV_DIR" ]; then
    echo "⚠️ Removing existing venv..."
    rm -rf "$VENV_DIR"
fi

# ---- 2) Create new venv ----
echo "🔧 Creating virtual environment..."
python3 -m venv "$VENV_DIR"

# ---- 3) Activate venv ----
echo "🔧 Activating venv..."
source "$VENV_DIR/bin/activate"

# ---- 4) Clean previous problematic packages ----
echo "🧹 Cleaning conflicting pip packages..."
pip uninstall -y numpy onnxruntime insightface opencv-python opencv-python-headless || true

# ---- 5) Upgrade pip ----
pip install --upgrade pip wheel setuptools

# ---- 6) Install exact working ARM versions ----
echo "📦 Installing ARM-compatible dependencies..."
pip install numpy==1.23.5
pip install opencv-python-headless==4.8.1.78
pip install onnxruntime-silicon==1.17.1
pip install insightface==0.7.3
pip install fastapi uvicorn python-multipart

# ---- 7) Install project-specific requirements if present ----
if [ -f "$REQ_FILE" ]; then
    echo "📦 Installing extra requirements from requirements.txt..."
    pip install -r "$REQ_FILE"
else
    echo "⚠️ No requirements.txt found, skipping extras."
fi

# ---- 8) Verify InsightFace ----
echo "🔍 Verifying InsightFace installation..."
python3 - << 'EOF'
try:
    import insightface
    from insightface.app import FaceAnalysis
    print("✅ InsightFace loaded correctly.")
except Exception as e:
    print("❌ ERROR loading InsightFace:")
    print(e)
    exit(1)
EOF

echo ""
echo "🎉 Setup complete!"
echo "➡ Run the service with:  ./run.sh"
