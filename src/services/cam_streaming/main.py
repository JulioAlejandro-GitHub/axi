import asyncio
from camera_stream.config import load_config
from camera_stream.db_adapter import DB
from camera_stream.camera_manager import CameraManager

async def main():
    cfg = load_config()
    db = DB(cfg["database"])
    await db.connect()

    manager = CameraManager(db, cfg)
    await manager.load_initial_cameras()

    print("▶ cam_streaming iniciado. Esperando comandos...")
    while True:
        await asyncio.sleep(3600)

if __name__ == "__main__":
    asyncio.run(main())
