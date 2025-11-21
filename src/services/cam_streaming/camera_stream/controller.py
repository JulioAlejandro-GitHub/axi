# camera_stream/controller.py
import logging
from fastapi import FastAPI
from pydantic import BaseModel
import asyncio
import uvicorn


class CameraUpdate(BaseModel):
    camara_id: int


class Controller:
    def __init__(self, manager, db):
        self.manager = manager
        self.db = db
        self.app = FastAPI()

        # -------------------------------------------------------
        # 🟢 1) Update de cámara desde el frontend
        # -------------------------------------------------------
        @self.app.post("/camera/update")
        async def update_camera(data: CameraUpdate):
            cam_id = data.camara_id
            logging.info(f"[Controller] Recibido update para cámara {cam_id}")

            cam = await self.db.get_camera(cam_id)
            if not cam:
                return {"error": f"Camera {cam_id} not found"}

            estado = cam["estado"]

            if estado == "Activo":
                await self.manager.restart_camera(cam)
            else:
                await self.manager.stop_camera(cam_id)

            return {"status": "ok", "camara_id": cam_id, "estado": estado}

        # -------------------------------------------------------
        # 🟡 2) Forzar iniciar cámara manualmente
        # -------------------------------------------------------
        @self.app.post("/camera/start")
        async def start_camera(data: CameraUpdate):
            cam = await self.db.get_camera(data.camara_id)
            if not cam:
                return {"error": "camera not found"}

            await self.manager.start_camera(cam)
            return {"status": "started", "camara_id": data.camara_id}

        # -------------------------------------------------------
        # 🟠 3) Forzar detener cámara manualmente
        # -------------------------------------------------------
        @self.app.post("/camera/stop")
        async def stop_camera(data: CameraUpdate):
            await self.manager.stop_camera(data.camara_id)
            return {"status": "stopped", "camara_id": data.camara_id}

        # -------------------------------------------------------
        # 🔁 4) Recargar TODAS las cámaras activas desde BD
        # -------------------------------------------------------
        @self.app.post("/camera/reload")
        async def reload_all():
            await self.manager.load_initial_cameras()
            return {"status": "reloaded"}

    # -------------------------------------------------------
    # 🟣 Iniciar servidor HTTP
    # -------------------------------------------------------
    async def start_http_server(self, port=8020):
        logging.info(f"[Controller] HTTP server iniciado en puerto {port}")
        config = uvicorn.Config(self.app, host="0.0.0.0", port=port, log_level="info")
        server = uvicorn.Server(config)
        await server.serve()
