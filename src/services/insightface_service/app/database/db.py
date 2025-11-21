# insightface_service/database/db.py
import mysql.connector
import logging

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
        return self.pool.get_connection()

    def query(self, sql, params=None):
        conn = self.get_conn()
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params)
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return rows

    def execute(self, sql, params=None):
        conn = self.get_conn()
        cur = conn.cursor()
        cur.execute(sql, params)
        conn.commit()
        cur.close()
        conn.close()
