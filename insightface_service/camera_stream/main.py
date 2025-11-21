# camera_stream/main.py
import asyncio
from camera_manager import CameraManager
from config import load_config


async def main():
    cfg = load_config()
    manager = CameraManager(cfg)
    await manager.start()


if __name__ == '__main__':
    asyncio.run(main())