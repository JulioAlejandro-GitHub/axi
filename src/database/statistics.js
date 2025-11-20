// const mysql = require('mysql2/promise');
// const { dbConnection } = require('../database/config');

const { pool } = require("../database/config");

async function getMonthlyStats(startDate, endDate, tipos) {
    // const connection = await dbConnection();
    const connection = await pool.getConnection();
    try {
        let query = `
            SELECT
                DATE_FORMAT(fecha_creacion, '%Y-%m') AS month,
                tipo,
                COUNT(*) AS count
            FROM usuario
            WHERE 1=1
        `;

        const params = [];

        if (startDate) {
            query += ' AND fecha_creacion >= ?';
            params.push(startDate);
        }

        if (endDate) {
            query += ' AND fecha_creacion <= ?';
            params.push(endDate);
        }

        if (tipos && tipos.length > 0) {
            query += ` AND tipo IN (${tipos.map(() => '?').join(',')})`;
            params.push(...tipos);
        }

        query += ' GROUP BY month, tipo ORDER BY month, tipo';

        const [rows] = await connection.query(query, params);


        // Process the data to be in the format expected by Google Charts
        const chartData = [['Month', 'Tipo', 'Count']];
        const monthlyData = {};

        rows.forEach(row => {
            if (!monthlyData[row.month]) {
                monthlyData[row.month] = {};
            }
            monthlyData[row.month][row.tipo] = row.count;
        });

        for (const month in monthlyData) {
            for (const tipo in monthlyData[month]) {
                chartData.push([month, tipo, monthlyData[month][tipo]]);
            }
        }

        return chartData;
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

const getDetailedRecognitionLog = async (filters) => {
    const { startDate, endDate, camera, type, page = 1, pageSize = 10 } = filters;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
        whereClause += ' AND a.fecha_acceso >= ?';
        params.push(startDate);
    }
    if (endDate) {
        whereClause += ' AND a.fecha_acceso <= ?';
        params.push(endDate);
    }
    if (camera) {
        whereClause += ' AND a.camara_id = ?';
        params.push(camera);
    }
    if (type) {
        whereClause += ' AND a.tipo = ?';
        params.push(type);
    }

    const countQuery = `
        SELECT COUNT(*) as total
        FROM acceso a
        JOIN usuario u ON a.usuario_id = u.usuario_id
        LEFT JOIN camara c ON a.camara_id = c.camara_id
        ${whereClause}
    `;
    const [countRows] = await pool.query(countQuery, params);
    const totalRecords = countRows[0].total;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const dataQuery = `
        SELECT a.acceso_id, u.nombre as usuario, a.tipo, c.nombre as camara, a.fecha_acceso
        FROM acceso a
        JOIN usuario u ON a.usuario_id = u.usuario_id
        LEFT JOIN camara c ON a.camara_id = c.camara_id
        ${whereClause}
        ORDER BY a.fecha_acceso DESC
        LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataQuery, [...params, pageSize, offset]);

    return {
        results: rows,
        totalPages,
        currentPage: parseInt(page, 10),
        totalRecords
    };
};

const getRecognitionSummary = async (filters) => {
    const { startDate, endDate, page = 1, pageSize = 10 } = filters;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
        whereClause += ' AND fecha_acceso >= ?';
        params.push(startDate);
    }
    if (endDate) {
        whereClause += ' AND fecha_acceso <= ?';
        params.push(endDate);
    }

    const countQuery = `
        SELECT COUNT(*) as total FROM (
            SELECT 1
            FROM acceso
            ${whereClause}
            GROUP BY tipo
        ) as subquery
    `;
    const [countRows] = await pool.query(countQuery, params);
    const totalRecords = countRows[0].total;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const dataQuery = `
        SELECT tipo, COUNT(*) as count
        FROM acceso
        ${whereClause}
        GROUP BY tipo
        LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query(dataQuery, [...params, pageSize, offset]);
    return {
        results: rows,
        totalPages,
        currentPage: parseInt(page, 10),
        totalRecords
    };
};

const getRecognitionByUser = async (filters) => {
    const { startDate, endDate, user, page = 1, pageSize = 10 } = filters;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
        whereClause += ' AND a.fecha_acceso >= ?';
        params.push(startDate);
    }
    if (endDate) {
        whereClause += ' AND a.fecha_acceso <= ?';
        params.push(endDate);
    }
    if (user) {
        whereClause += ' AND u.nombre LIKE ?';
        params.push(`%${user}%`);
    }

    const countQuery = `
        SELECT COUNT(*) as total FROM (
            SELECT 1
            FROM acceso a
            JOIN usuario u ON a.usuario_id = u.usuario_id
            ${whereClause}
            GROUP BY u.nombre, a.tipo
        ) as subquery
    `;
    const [countRows] = await pool.query(countQuery, params);
    const totalRecords = countRows[0].total;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const dataQuery = `
        SELECT u.nombre, a.tipo, COUNT(*) as count
        FROM acceso a
        JOIN usuario u ON a.usuario_id = u.usuario_id
        ${whereClause}
        GROUP BY u.nombre, a.tipo
        ORDER BY u.nombre
        LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataQuery, [...params, pageSize, offset]);

    return {
        results: rows,
        totalPages,
        currentPage: parseInt(page, 10),
        totalRecords
    };
};

module.exports = {
    getMonthlyStats,
    getDetailedRecognitionLog,
    getRecognitionSummary,
    getRecognitionByUser
};
