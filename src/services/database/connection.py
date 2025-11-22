# src/services/database/connection.py
import os
import aiomysql
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv

# Cargar variables de entorno desde el archivo .env en la raíz del proyecto
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

class Database:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance.engine = None
            cls._instance.async_engine = None
        return cls._instance

    def get_db_url(self, is_async=False):
        driver = "mysql+aiomysql" if is_async else "mysql+mysqlconnector"
        return (
            f"{driver}://"
            f"{os.getenv('db_user')}:{os.getenv('db_password')}@"
            f"{os.getenv('db_host')}:{os.getenv('db_port', 3306)}/"
            f"{os.getenv('db_database')}"
        )

    def get_engine(self):
        if self.engine is None:
            db_url = self.get_db_url()
            self.engine = sa.create_engine(db_url, pool_pre_ping=True)
        return self.engine

    def get_async_engine(self):
        if self.async_engine is None:
            db_url = self.get_db_url(is_async=True)
            self.async_engine = create_async_engine(db_url, pool_pre_ping=True)
        return self.async_engine

db_instance = Database()

def get_engine():
    return db_instance.get_engine()

def get_async_engine():
    return db_instance.get_async_engine()
