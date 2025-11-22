# camera_stream/db_adapter.py
from sqlalchemy import select, update
from src.services.database.connection import get_async_engine
from src.services.database.models import camara

class DB:
    def __init__(self):
        self._engine = get_async_engine()

    async def connect(self):
        pass

    async def close(self):
        await self._engine.dispose()

    async def get_active_cameras(self):
        """
        Cámaras onvif en estado 'Activo'.
        """
        query = select(camara).where(
            camara.c.protocolo == 'onvif',
            camara.c.estado == 'Activo'
        ).order_by(
            camara.c.orden.asc(),
            camara.c.camara_id.asc()
        )
        async with self._engine.connect() as conn:
            result = await conn.execute(query)
            return result.fetchall()

    async def get_camera(self, camara_id: int):
        """
        Obtener una cámara por ID.
        """
        query = select(camara).where(camara.c.camara_id == camara_id)
        async with self._engine.connect() as conn:
            result = await conn.execute(query)
            return result.fetchone()

    async def update_camera_state(self, camara_id: int, estado: str):
        """
        Actualizar el estado de una cámara: 'Activo' / 'Inactivo'
        """
        query = update(camara).where(camara.c.camara_id == camara_id).values(estado=estado)
        async with self._engine.connect() as conn:
            await conn.execute(query)
            await conn.commit()
