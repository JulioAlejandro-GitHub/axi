const { createPool } = require('mysql2/promise');
const logger = require('../helpers/logger');

const pool = createPool({
    connectionLimit: 100,
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_password,
    database: process.env.db_database,
    port: process.env.db_port
});

if (!pool) {
    logger.error('Could not create database pool');
}

async function queryExe(sql,where_var) {
    const [rows] = await pool.query(sql, where_var.map((v) => v))
    return rows;
}

module.exports = {
    pool,
    queryExe
}