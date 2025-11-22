#!/bin/bash
# Navegar al directorio del script para poder activar el venv
cd "$(dirname "$0")"
source venv_insight/bin/activate

# Volver al directorio raíz del proyecto
cd ../../..

# Añadir el directorio raíz a PYTHONPATH y ejecutar el módulo
export PYTHONPATH=$(pwd)
python -m src.services.insightface_service.app.main
