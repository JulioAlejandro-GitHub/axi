# camera_stream/db_adapter.py
import aiomysql


class DB:
    def __init__(self, cfg: dict):
        self._cfg = cfg
        self._pool = None

    async def connect(self):
        """
        Crear el pool de conexiones (se llama una sola vez al inicio).
        """
        self._pool = await aiomysql.create_pool(
            host=self._cfg["host"],
            port=self._cfg.get("port", 3306),
            user=self._cfg["user"],
            password=self._cfg["password"],
            db=self._cfg["database"],
            autocommit=True,
            minsize=1,
            maxsize=5,
        )

    async def close(self):
        if self._pool:
            self._pool.close()
            await self._pool.wait_closed()

    async def _fetchall(self, sql: str, params=None):
        params = params or ()
        async with self._pool.acquire() as conn:
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(sql, params)
                rows = await cur.fetchall()
                return rows

    async def _execute(self, sql: str, params=None):
        params = params or ()
        async with self._pool.acquire() as conn:
            async with conn.cursor() as cur:
                await cur.execute(sql, params)

    # ----------------------------
    # MÉTODOS ESPECÍFICOS DEL DOMINIO
    # ----------------------------

    async def get_active_cameras(self):
        """
        Cámaras onvif en estado 'Activo'.
        """
        sql = """
        SELECT *
        FROM camara
        WHERE protocolo = 'onvif'
          AND estado = 'Activo'
        ORDER BY orden ASC, camara_id ASC
        """
        return await self._fetchall(sql)

    async def get_camera(self, camara_id: int):
        """
        Obtener una cámara por ID.
        """
        sql = """
        SELECT *
        FROM camara
        WHERE camara_id = %s
        """
        rows = await self._fetchall(sql, (camara_id,))
        return rows[0] if rows else None

    async def update_camera_state(self, camara_id: int, estado: str):
        """
        Actualizar el estado de una cámara: 'Activo' / 'Inactivo'
        """
        sql = """
        UPDATE camara
        SET estado = %s
        WHERE camara_id = %s
        """
        await self._execute(sql, (estado, camara_id))
