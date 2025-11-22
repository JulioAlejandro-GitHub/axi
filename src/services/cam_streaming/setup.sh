#!/bin/bash
set -e # Salir si algún comando falla

cd "$(dirname "$0")"

# Eliminar el venv antiguo si existe para asegurar una instalación limpia
if [ -d "venv_stream" ]; then
    echo "Eliminando el entorno virtual existente..."
    rm -rf venv_stream
fi

echo "Creando un nuevo entorno virtual..."
python3 -m venv venv_stream

echo "Instalando dependencias..."
# Usar el intérprete de python del venv para ejecutar pip
./venv_stream/bin/python3 -m pip install --upgrade pip
./venv_stream/bin/python3 -m pip install -r requirements.txt

echo "¡Setup completado!"
