Activar venv: source venv/bin/activate

Instalar deps: pip install -r camera_stream/requirements.txt

Ejecutar: python -m camera_stream.main

Systemd service (ejemplo):

[Unit]
Description=Camera Stream Service
After=netwo