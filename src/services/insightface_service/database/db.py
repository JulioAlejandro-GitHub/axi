# insightface_service/database/db.py
import logging
import os
from contextlib import contextmanager
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv
from mysql.connector import errors

# Cargar variables de entorno desde la raíz del repo
ENV_PATH = Path(__file__).resolve().parents[4] / ".env"
load_dotenv(ENV_PATH)

_db_singleton = None

class Database:
    def __init__(self, cfg):
        self.cfg = cfg
        self.pool = mysql.connector.pooling.MySQLConnectionPool(
            pool_name="vigilante_pool",
            pool_size=10,
            host=cfg["db_host"],
            port=cfg["db_port"],
            user=cfg["db_user"],
            password=cfg["db_password"],
            database=cfg["db_database"],
        )

    def get_conn(self):
        try:
            return self.pool.get_connection()
        except (errors.PoolError, Exception) as e:
            logging.warning("Pool de conexiones agotado, creando conexión directa: %s", e)
            return mysql.connector.connect(
                host=self.cfg["db_host"],
                port=self.cfg["db_port"],
                user=self.cfg["db_user"],
                password=self.cfg["db_password"],
                database=self.cfg["db_database"],
            )

    @contextmanager
    def cursor(self, dict=False):
        conn = self.get_conn()
        cur = conn.cursor(dictionary=dict)
        try:
            yield cur
            conn.commit()
        finally:
            try:
                cur.close()
            except Exception:
                pass
            try:
                conn.close()
            except Exception:
                pass

    def query(self, sql, params=None):
        with self.cursor(dict=True) as cur:
            cur.execute(sql, params)
            return cur.fetchall()

    def execute(self, sql, params=None):
        with self.cursor() as cur:
            cur.execute(sql, params)


def get_db():
    """
    Singleton Database usando credenciales de entorno (.env).
    """
    global _db_singleton
    if _db_singleton is None:
        cfg = {
            "db_host": os.getenv("db_host"),
            "db_port": int(os.getenv("db_port", 3306)),
            "db_user": os.getenv("db_user"),
            "db_password": os.getenv("db_password"),
            "db_database": os.getenv("db_database"),
        }
        _db_singleton = Database(cfg)
    return _db_singleton
