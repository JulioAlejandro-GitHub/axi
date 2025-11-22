# Módulo de Base de Datos Compartida

Este módulo proporciona una forma centralizada de conectarse a la base de datos MySQL utilizando SQLAlchemy. Está diseñado para ser utilizado por todos los servicios de Python dentro de este proyecto.

## Uso

### Conexión Síncrona

Para los servicios que no utilizan `asyncio`, puede obtener un motor de SQLAlchemy de la siguiente manera:

```python
from src.services.database.connection import get_engine

engine = get_engine()
with engine.connect() as connection:
    # ... su código aquí ...
```

### Conexión Asíncrona

Para los servicios que utilizan `asyncio`, puede obtener un motor de SQLAlchemy asíncrono de la siguiente manera:

```python
import asyncio
from src.services.database.connection import get_async_engine

async def main():
    engine = get_async_engine()
    async with engine.connect() as connection:
        # ... su código aquí ...

if __name__ == "__main__":
    asyncio.run(main())
```

### Definición de Tablas

Las definiciones de las tablas de la base de datos se encuentran en `src/services/insightface_service/database/db.py` y `src/services/cam_streaming/camera_stream/db_adapter.py`. Estas definiciones se pueden centralizar en el futuro.

## Configuración

La configuración de la base de datos se carga desde un archivo `.env` en la raíz del proyecto. El archivo debe contener las siguientes variables:

- `db_host`
- `db_port`
- `db_user`
- `db_password`
- `db_database`
