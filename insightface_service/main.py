# main.py
import asyncio
from camera_stream.camera_manager import CameraManager
from camera_stream.config import load_config
from camera_stream.db_adapter import init_db

async def main():
    print("🔥 Iniciando servicio de Camera Stream + Batch Mode + ONVIF...")
    
    # 1. Cargar configuración
    cfg = load_config()

    # 2. Inicializar conexión DB (global pool)
    await init_db(cfg["database"])

    # 3. Crear CameraManager
    manager = CameraManager(cfg)

    # 4. Iniciar ciclo principal del servicio
    try:
        await manager.start()
    except KeyboardInterrupt:
        print("🛑 Finalizando servicio…")

if __name__ == "__main__":
    asyncio.run(main())
