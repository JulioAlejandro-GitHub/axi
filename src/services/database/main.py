# src/services/database/main.py
import asyncio
from sqlalchemy.sql import text
from src.services.database.connection import get_engine, get_async_engine

def test_sync_connection():
    print("Testing sync connection...")
    try:
        engine = get_engine()
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            for row in result:
                print(row)
        print("Sync connection successful.")
    except Exception as e:
        print(f"Sync connection failed: {e}")

async def test_async_connection():
    print("Testing async connection...")
    try:
        engine = get_async_engine()
        async with engine.connect() as connection:
            result = await connection.execute(text("SELECT 1"))
            for row in result:
                print(row)
        print("Async connection successful.")
    except Exception as e:
        print(f"Async connection failed: {e}")

if __name__ == "__main__":
    test_sync_connection()
    asyncio.run(test_async_connection())
