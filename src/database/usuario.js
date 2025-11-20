/**
 * modelo solo desdicado a consultar BD
 * sin express
 * no responder directo a web
 */
// const { response } = require('express');
const { pool } = require("../database/config");
const logger = require('../helpers/logger');

/**
 * 
 * Usuario
 */
const BDgetUsuario = async (params) => {
    const { id, ids, email, password, estado, tipos, ...resto } = params

    let pagina = 1;
    let tamano_pagina = 10;

    if (resto.pagina) {
        pagina = resto.pagina
    }
    if (resto.tamano_pagina) {
        tamano_pagina = resto.tamano_pagina
    }
    let offset = (pagina - 1) * tamano_pagina;
    

    if (!id) {
        /**
         * se requieren todos los usuarios, para reporte
         * verficar si usuario esta autenticado 
         * login y si es administrador
         * paginar
         */
    }
    // if (!empresa_id) {
    //     /**
    //      * se requieren todos los empresa_id ????
    //      */
    // }
    try {
        let sql = `SELECT 
                        usuario.usuario_id,
                        usuario.nombre,
                        usuario.tipo AS usuario_tipo,
                        DATE_FORMAT(usuario.fecha_creacion, "%Y/%m/%d  %H:%i") AS fecha_creacion,
                        usuario.estado,
                        DATE_FORMAT(usuario.fecha_eliminacion, "%Y/%m/%d  %H:%i") AS fecha_eliminacion,
                        usuario.email,
                        usuario.password_bcryptjs,
                        usuario.gender,
                        (SELECT img FROM acceso WHERE acceso.usuario_id = usuario.usuario_id ORDER BY fecha_acceso DESC LIMIT 1) as profile_image,
                        sucursal.local_id,
                        sucursal.nombre     AS local_nombre,
                        empresa.nombre      AS empresa_nombre,
                        DATE_FORMAT(now(), "%W  %H:%i") AS fecha_alert
            FROM 
                usuario
                INNER JOIN sucursal ON sucursal.local_id   = usuario.local_id
                INNER JOIN empresa  ON empresa.empresa_id  = sucursal.empresa_id
            `;

        /* Agregar params a SQL ****************/
        let where = [];
        let where_var = [];
        let where_full = [];

        /* eliminado o inactivo ****************/
        where.push(`usuario.fecha_eliminacion is ? AND`);
        where_var.push(null)
        where.push(`usuario.estado != ? AND`);
        where_var.push('inactivo')
        /* eliminado o inactivo ****************/

        if (id) {
            where.push(`usuario.usuario_id = ? AND`);
            where_var.push(id)
        }
        if (ids && ids.length > 0) {
            where.push(`usuario.usuario_id IN (?) AND`);
            where_var.push(ids)
        }
        if (resto.local_id) {
            where.push(`sucursal.local_id = ? AND`);
            where_var.push(resto.local_id)
        }
        if (resto.empresa_id) {
            where.push(`empresa.empresa_id = ? AND`);
            where_var.push(resto.empresa_id)
        }

        if (email) {
            where.push(`usuario.email = ? AND`);
            where_var.push(email)
        }
        if (password) {
            where.push(`usuario.password_bcryptjs = ? AND`);
            where_var.push(password)
        }
        if (estado) {
            where.push(`usuario.estado = ? AND`);
            where_var.push(estado)
        }
        if (tipos && tipos.length > 0) {
            where.push(`usuario.tipo IN (?) AND`);
            where_var.push(tipos);
        }
        if (where.length === 0) {
            /* 
            error no seleccione todo de una tabla
            agregar almenos un where de restriccion
            solo permitido para usuarios adminitradores
            siempre con Limit
            empresa, local, etc..
            **/
        }
        /* String SQL ****************/
        if (where.length > 0) {
            where_full = ` WHERE `
            for (const value in where_var) {
                /*
                este [or], depende de cada where filtro !!!!!
                puede ser AND, OR, >=, etc
                */
                where_full += ` ${where[value]}`
            }
            where_full = where_full.substring(0, where_full.length - 3) //" AND"
            sql += where_full
        }
        sql += ` ORDER BY usuario.usuario_id DESC`;
        sql += ` LIMIT ? OFFSET ?`;


        /* SQL query ****************/
        // Build the count query - para paginar
        let countSql = `SELECT 
                            COUNT(usuario.usuario_id) as total 
                        FROM usuario 
                        INNER JOIN sucursal ON sucursal.local_id  = usuario.local_id 
                        INNER JOIN empresa  ON empresa.empresa_id = sucursal.empresa_id`;
        if (where.length > 0) {
            countSql += where_full;
        }

        // Execute both queries
        const [[{ total }]] = await pool.query(countSql, where_var);
        const [rows] = await pool.query(sql, [...where_var, tamano_pagina, offset]);

        if (rows.length === 0) {
            return ({
                msg: 'Usuario no encontrado BDgetUsuario',
                rows: [],
                total: 0
            });
        }
        return ({
            msg: 'ok',
            rows,
            total
        });
    } catch (err) {
        logger.error('err BDgetUsuario:', err)
        return ({
            msg: 'Usuario no encontrado BDgetUsuario',
            rows: 0
        });
    }
}
const BDdelUsuario = async (params) => {
    const { id } = params

    if (!id) {
        return ({
            msg: 'no actualizado id'
        });
    }
    try {
        const [rows] = await pool.query('SELECT usuario_id,fecha_eliminacion FROM usuario WHERE usuario_id = ?', [id])
        if (rows.length === 0) {
            return ({
                msg: 'no actualizado no encontrado'
            });
        }
        if (rows[0].fecha_eliminacion) {
            return ({
                msg: 'no actualizado ya eliminado'
            });
        }
    } catch (err) {
        logger.error('delUsuario:', err)
        return ({
            msg: 'no actualizado BD sel **********'
        });
    }

    try {
        const [results] = await pool.query('update usuario set fecha_eliminacion = NOW() where usuario_id = ?', [id])
        if (results.affectedRows === 0) {
            return ({
                msg: 'no actualizado'
            });
        }
        return ({
            msg: 'ok'
        });
    } catch (err) {
        logger.error('delUsuario:', err)
        return ({
            msg: 'no actualizado BD'
        });
    }
}
const BDputUsuario = async (params) => {
    const { nombre, 
            email, 
            password_bcryptjs, 
            tipo = 'desconocido', 
            estado = 'activo', 
            google = false, 
            local_id = 2, 
            gender = 'male' } = params;

    if (
        !nombre ||
        !email ||
        !password_bcryptjs
    ) {
        logger.error('err BDputUsuario Error - params BDputUsuario')
        return ({
            msg: 'Error - params BDputUsuario',
            rows: 0
        });
    }

    try {
        const sql = `INSERT INTO usuario (
                nombre,
                tipo,
                estado,
                email,
                password_bcryptjs,
                fecha_creacion,
                google,
                local_id,
                gender
            )
          VALUES
            (?, ?, ?, ?, ?, NOW(), ?, ?, ?)`;

        const values = [nombre, tipo, estado, email, password_bcryptjs, google, local_id, gender];

        /* SQL query ****************/
        const [result] = await pool.query(sql, values)

        if (result.affectedRows === 0) {
            return ({
                msg: 'Error Inseert BDputUsuario',
                rows: 0
            });
        }
        const row_usr = await BDgetUsuario({ id: result.insertId })
        return ({
            msg: 'ok',
            rows: row_usr.rows[0]
        });
    } catch (err) {
        logger.error('err BDputUsuario:', err)
        return ({
            msg: 'Error Inseert BDputUsuario',
            rows: 0
        });
    }
}
const BDupdUsuario = async (params) => {
    const { usuario_id, nombre, tipo, estado, email, password_bcryptjs, local_id, gender } = params;

    if (!usuario_id) {
        return { msg: 'Error - params BDupdUsuario: usuario_id is required', rows: 0 };
    }

    const setClauses = [];
    const values = [];

    if (nombre) {
        setClauses.push('nombre = ?');
        values.push(nombre);
    }
    if (tipo) {
        setClauses.push('tipo = ?');
        values.push(tipo);
    }
    if (estado) {
        setClauses.push('estado = ?');
        values.push(estado);
        if (estado === 'inactivo') {
            setClauses.push('fecha_eliminacion = NOW()');
        }
    }
    if (email) {
        setClauses.push('email = ?');
        values.push(email);
    }
    if (password_bcryptjs) {
        setClauses.push('password_bcryptjs = ?');
        values.push(password_bcryptjs);
    }
    if (local_id) {
        setClauses.push('local_id = ?');
        values.push(local_id);
    }
    if (gender) {
        setClauses.push('gender = ?');
        values.push(gender);
    }

    if (setClauses.length === 0) {
        return { msg: 'No fields to update', rows: 0 };
    }

    values.push(usuario_id);

    const sql = `UPDATE usuario SET ${setClauses.join(', ')} WHERE usuario_id = ?`;

    try {
        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return { msg: 'User not found or no changes made', rows: 0 };
        }

        const row_usr = await BDgetUsuario({ id: usuario_id });
        return {
            msg: 'ok',
            rows: row_usr.rows[0]
        };
    } catch (err) {
        logger.error(`Error BDupdUsuario -> [${err}]`);
        return { msg: 'Error updating user in BDupdUsuario', rows: 0 };
    }
}
const BDaddLogin = async (params) => {
    const { usuario_id, tipo } = params;

    if (!usuario_id || !tipo) {
        return { msg: 'Error - params BDaddLogin: usuario_id and tipo are required' };
    }

    try {
        const sql = `INSERT INTO login (usuario_id, fecha_login, tipo) VALUES (?, NOW(), ?)`;
        const values = [usuario_id, tipo];
        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return { msg: 'Error inserting login record' };
        }
        return { msg: 'ok', insertId: result.insertId };
    } catch (err) {
        logger.error(`Error BDaddLogin -> [${err}]`);
        return { msg: 'Error inserting login record in BDaddLogin' };
    }
};



/**
 * 
 * Acceso
 */
const BDupdAccesoImgCompreFace = async (params) => {
    const { acceso_id, img } = params;

    if (!acceso_id || !img) {
        return { msg: 'Error - params BDupdAccesoImgCompreFace: acceso_id and img are required' };
    }

    try {
        const sql = 'UPDATE acceso SET img_compreface = ? WHERE acceso_id = ?';
        const values = [img, acceso_id];
        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return { msg: 'Error BDupdAccesoImgCompreFace access record or record not found' };
        }
        return { msg: 'ok' };
    } catch (err) {
        logger.error(`Error BDupdAccesoImgCompreFace -> [${err}]`);
        return { msg: 'Error updating access record in BDupdAccesoImgCompreFace' };
    }
};
const BDgetAccesoUsuario = async (params) => {
    const { acceso_id } = params;

    if (!acceso_id ) {
        return { msg: 'Error - params BDgetAccesoUsuario: acceso_id  are required' };
    }

    try {
        const sql = `SELECT 
                        acceso_id,
                        usuario_id,
                        camara_id,
                        fecha_acceso,
                        tipo,
                        estado,
                        similarity,
                        perfil,
                        img,
                        embedding,
                        fecha_eliminacion,
                        mesh,
                        img_compreface
                    FROM acceso
                    WHERE acceso_id = ?`;

        const values = [acceso_id];
        const [rows] = await pool.query(sql, values);

        if (rows.length === 0) {
            return ({
                msg: 'Error BDgetAccesoUsuario access record or record not found',
                rows: []
            });
        }
        return ({
            msg: 'ok',
            rows
        });
    } catch (err) {
        logger.error(`Error BDgetAccesoUsuario -> [${err}]`);
        return ({
            msg: 'Error  access record in BDgetAccesoUsuario',
            rows: []
        });
    }
};
const BDupdAccesoUsuario = async (params) => {
    const { acceso_id, usuario_id } = params;

    if (!acceso_id || !usuario_id) {
        return { msg: 'Error - params BDupdAccesoUsuario: acceso_id and usuario_id are required' };
    }

    try {
        const sql = 'UPDATE acceso SET usuario_id = ? WHERE acceso_id = ?';
        const values = [usuario_id, acceso_id];
        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return { msg: 'Error updating access record or record not found' };
        }
        return { msg: 'ok' };
    } catch (err) {
        logger.error(`Error BDupdAccesoUsuario -> [${err}]`);
        return { msg: 'Error updating access record in BDupdAccesoUsuario' };
    }
};
const BDDeleteAcceso = async (params) => {
    const { 
        acceso_id
    } = params

    if (
        !Number.isInteger(acceso_id)
    ) {
        return ({
            msg: 'Error - params BDDeleteAcceso'
        });
    }
    try {
        const sql = 'UPDATE acceso SET fecha_eliminacion = NOW() WHERE acceso_id = ?';

        const [result] = await pool.query(sql, acceso_id)

        if (result.affectedRows === 0) {
            return ({
                msg: 'Error Insert embedding affectedRows'
            });
        }
        return ({
            msg: 'ok'
        });
    } catch (err) {
        return ({
            msg: `Error: BDDeleteAcceso [${err}]`
        });
    }
}
const BDAddAccesoUsuario = async (params) => {
    const { 
        usuario_id, 
        embedding, 
        mesh,
        imgName, 
        perfil, 
        similarity 
    } = params

    if (
        !Number.isInteger(usuario_id) ||
        typeof embedding === 'undefined' ||
        typeof imgName === 'undefined' || imgName.trim().length === 0
    ) {
        return ({
            msg: 'Error - params BDAddAccesoUsuario'
        });
    }
    try {

        const sql = `INSERT INTO acceso (
            usuario_id,
            embedding,
            mesh,
            img,
            perfil,
            similarity
        )
        VALUES
        (?, ?, ?, ?, ?, ?)`;

        const values = [usuario_id, JSON.stringify(embedding), JSON.stringify(mesh), imgName, perfil, similarity];

        /* SQL query ****************/
        const [rows] = await pool.query(sql, values)

        if (rows.affectedRows === 0) {
            return ({
                msg: 'Error Insert embedding affectedRows'
            });
        }
        return ({
            msg: 'ok',
            insertId: rows.insertId,
            rows
        });
    } catch (err) {
        return ({
            msg: `Error: catch Insert embedding [${err}]`
        });
    }
}
const BDAddAcceso = async (params) => {
    const { 
            usuario_id, 
            tipo = 'desconocido', 
            estado = 'por_validar', 
            camara_id, 
            similarity = 0, 
            embedding, 
            img,
            perfil = 'undetected',
            mesh } = params

    // if (
    //     !Number.isInteger(usuario_id)
    // ) {
    //     return ({
    //         msg: 'Error - params BDAddAcceso'
    //     });
    // }

    try {
        const sql = `INSERT INTO acceso (
                        usuario_id,
                        fecha_acceso,
                        tipo,
                        estado,
                        camara_id,
                        similarity,
                        embedding,
                        img,
                        perfil,
                        mesh
                    )
                    VALUES
                    (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [usuario_id, tipo, estado, camara_id, similarity, JSON.stringify(embedding), img, perfil, JSON.stringify(mesh)];
        const [rows] = await pool.query(sql, values)

        if (rows.affectedRows === 0) {
            return ({
                msg: 'Error Insert BDAddAcceso affectedRows'
            });
        }
        return ({
            msg: 'ok',
            insertId: rows.insertId,
            rows
        });
    } catch (err) {
        logger.error(`Error: catch Insert BDAddAcceso [${err}]`)
        return ({
            msg: `Error: catch Insert BDAddAcceso [${err}]`
        });
    }
}
const BDgetUsuarioAccesos = async (params) => {
    const { usuario_id, local_id, ...resto } = params
    let pagina = 1;
    let tamano_pagina = 10;
    if (resto.pagina) { pagina = resto.pagina }
    if (resto.tamano_pagina) { tamano_pagina = resto.tamano_pagina }
    let offset = (pagina - 1) * tamano_pagina;

    if (!usuario_id) {
        return ({
            msg: 'ID Usuario no encontrado BDgetUsuarioAccesos',
            rows: 0,
            total: 0
        });
    }

    /**
     * hay usuarios sin accesos
     */
    try {
        let sql = `
            SELECT
                usuario.nombre              AS usuario_nombre,
                usuario.tipo                AS usuario_tipo,
                DATE_FORMAT(usuario.fecha_creacion, "%Y/%m/%d  %H:%i") AS fecha_creacion,
                usuario.local_id,
                usuario.gender,

                empresa.empresa_id,
                empresa.nombre              AS empresa_nombre,

                sucursal.local_id,
                sucursal.nombre             AS local_nombre,

                acceso.acceso_id,
                acceso.acceso_id            AS face_id,
                acceso.usuario_id, 
                acceso.camara_id, 

                DATE_FORMAT(acceso.fecha_acceso, "%Y/%m/%d  %H:%i") AS fecha_acceso,
                acceso.tipo                 AS acceso_tipo, 
                acceso.estado               AS acceso_estado, 
                acceso.similarity, 
                acceso.perfil, 
                acceso.img, 
                acceso.img                  AS faces_img,
                acceso.embedding,
                acceso.mesh,

                camara.nombre               AS camara_nombre,
                camara.ubicacion            AS camara_ubicacion,
                camara.orden
            FROM usuario
            INNER JOIN acceso   ON usuario.usuario_id = acceso.usuario_id 
            INNER JOIN sucursal ON sucursal.local_id  = usuario.local_id
            INNER JOIN empresa  ON empresa.empresa_id = sucursal.empresa_id
            LEFT  JOIN camara   ON camara.camara_id   = acceso.camara_id 
            `;

        /* Agregar params a SQL ****************/
        let where = [];
        let where_var = [];
        let where_full = [];

        where.push(`acceso.fecha_eliminacion is ? AND`);
        where_var.push(null)

        where.push(`usuario.estado = ? AND`);
        where_var.push('activo')

        // caso usuario administrador ver toda la empresa + sucursales...
        where.push(`usuario.local_id = ? AND`);
        where_var.push(local_id)

        // and acceso.fecha_eliminacion is null

        if (usuario_id) {
            where.push(`usuario.usuario_id = ? AND`);
            where_var.push(usuario_id)
        }
        if (where.length === 0) {
            /* 
            error no seleccione todo de una tabla
            agregar almenos un where de restriccion
            solo permitido para usuarios adminitradores
            siempre con Limit
            **/
        }
        /* String SQL ****************/
        if (where.length > 0) {
            where_full = ` WHERE `
            for (const value in where_var) {
                where_full += ` ${where[value]}`
            }
            where_full = where_full.substring(0, where_full.length - 3) //" AND".  puede ser AND, OR, >=, etc
            sql += where_full
        }
        sql += ` ORDER BY acceso.acceso_id DESC`;
        sql += ` LIMIT ${tamano_pagina} OFFSET ${offset}`;

        /* SQL query paginar ****************/
        let countSql = `SELECT COUNT(acceso.acceso_id) as total 
                        FROM usuario
                        INNER JOIN acceso   ON usuario.usuario_id = acceso.usuario_id 
                        INNER JOIN sucursal ON sucursal.local_id  = usuario.local_id
                        INNER JOIN empresa  ON empresa.empresa_id = sucursal.empresa_id
                        LEFT  JOIN camara   ON camara.camara_id   = acceso.camara_id 
                        `;
        if (where.length > 0) {
            countSql += where_full;
        }
        const [[{ total }]] = await pool.query(countSql, where_var.map((w) => w));

        /* SQL query ****************/
        const [rows, result] = await pool.query(sql, where_var.map((w) => w))

        if (rows.length === 0) {
            return ({
                msg: 'FASES Usuario no encontrado BDgetUsuarioAccesos',
                rows: 0,
                total: 0
            });
        }
        return ({
            msg: 'ok',
            rows,
            total
        });
    } catch (err) {
        logger.error('err BDgetUsuarioAccesos:', err)
        return ({
            msg: 'FASES Usuario no encontrado BDgetUsuarioAccesos',
            rows: 0,
            total: 0
        });
    }
}
const BDUnificaAcceso = async (params) => {
    const { primary_user_id, secondary_user_ids } = params;

    if (!primary_user_id || !secondary_user_ids || secondary_user_ids.length === 0) {
        return { msg: 'Error - params BDUnificaAcceso' };
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const updateFacesQuery = 'UPDATE acceso SET usuario_id = ? WHERE usuario_id IN (?)';
        await connection.query(updateFacesQuery, [primary_user_id, secondary_user_ids]);

        // 3. Deactivate secondary users
        const deactivateUsersQuery = "UPDATE usuario SET estado = 'inactivo', fecha_eliminacion = NOW() WHERE usuario_id IN (?)";
        await connection.query(deactivateUsersQuery, [secondary_user_ids]);

        await connection.commit();
        return { msg: 'ok' };

    } catch (err) {
        await connection.rollback();
        logger.error('err BDUnificaAcceso:', err);
        return { msg: 'Error during unification process' };
    } finally {
        connection.release();
    }
};
const BD_ReportAccesos = async (params) => {
    let { local_id, pagina = 1, tipos = [], tamano_pagina = 10 } = params;

    if (!local_id) {
        return { rows: [], total: 0 };
    }

    const offset = (pagina - 1) * tamano_pagina;
    const limit_usr_img_card = 10; // Max images per user card

    // Use an array to hold parameters for the query to prevent SQL injection
    const queryParams = [];
    let whereClauses = [
        `u.local_id = ?`,
        `u.fecha_eliminacion IS NULL`,
        `u.estado != 'inactivo'`,
        `a.fecha_eliminacion IS NULL`
    ];
    queryParams.push(local_id);

    if (tipos && tipos.length > 0) {
        whereClauses.push(`u.tipo IN (?)`);
        queryParams.push(tipos);
    }
    
    const whereSql = whereClauses.join(' AND ');

    // We need a separate query for the total count, as it's complex to get with the grouped result
    const countSql = `
        SELECT COUNT(DISTINCT u.usuario_id) as total
        FROM usuario u
        INNER JOIN acceso a ON u.usuario_id = a.usuario_id
        WHERE ${whereSql}`;

    const [[{ total }]] = await pool.query(countSql, queryParams);

    if (total === 0) {
        return { rows: [], total: 0 };
    }

    // Main query using CTEs for clarity and performance
    const sql = `
        WITH PaginatedUsers AS (
            -- Step 1: Get the paginated list of user IDs that have matching accesses
            SELECT
                u.usuario_id
            FROM
                usuario u
            INNER JOIN
                acceso a ON u.usuario_id = a.usuario_id
            WHERE
                ${whereSql}
            GROUP BY
                u.usuario_id
            ORDER BY
                MAX(a.fecha_acceso) DESC -- Order users by their most recent access
            LIMIT ? OFFSET ?
        ),
        RankedAccesses AS (
            -- Step 2: Get the most recent accesses for ONLY the paginated users
            SELECT
                a.acceso_id,
                a.usuario_id,
                a.img,
                c.nombre AS camara_nombre,
                a.similarity,
                DATE_FORMAT(a.fecha_acceso, "%Y/%m/%d %H:%i") AS fecha_acceso,
                ROW_NUMBER() OVER(PARTITION BY a.usuario_id ORDER BY a.fecha_acceso DESC) as rn
            FROM
                acceso a
            INNER JOIN
                PaginatedUsers pu ON a.usuario_id = pu.usuario_id
            LEFT JOIN
                camara c ON a.camara_id = c.camara_id
            where a.fecha_eliminacion IS NULL
        )
        -- Final Step: Combine user info with their aggregated, ranked accesses
        SELECT
            u.usuario_id,
            u.nombre AS usuario_nombre,
            u.tipo AS usuario_tipo,
            DATE_FORMAT(u.fecha_creacion, "%Y/%m/%d %H:%i") AS usuario_fecha_creacion,
            u.fecha_eliminacion,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'acceso_id', ra.acceso_id,
                    'img', ra.img,
                    'camara_nombre', ra.camara_nombre,
                    'similarity', ra.similarity,
                    'fecha_acceso', ra.fecha_acceso
                )
            ) AS accesos
        FROM
            usuario u
        INNER JOIN
            RankedAccesses ra ON u.usuario_id = ra.usuario_id
        WHERE
            ra.rn <= ? -- Limit img
        GROUP BY
            u.usuario_id, u.nombre, u.tipo, u.fecha_creacion, u.fecha_eliminacion
        ORDER BY
            MAX(ra.fecha_acceso) DESC
    `;

    // Add pagination and  limits to the query parameters
    const finalParams = [...queryParams, tamano_pagina, offset, limit_usr_img_card];

    try {
        const [rows] = await pool.query(sql, finalParams);
        return { rows, total };
    } catch (err) {
        logger.error('err BD_ReportAccesos:', err);
        return { msg: 'Error fetching access report', rows: [], total: 0 };
    }
};
const BD_SelAccesoUsuario = async (params) => {
    const { face_id } = params || {};

    try {
        const queryParams = [];
        let whereClauses = [
            "u.fecha_eliminacion IS NULL",
            "u.estado = 'activo'",
            "a.fecha_eliminacion IS NULL"
        ];

        if (face_id) {
            whereClauses.push("a.acceso_id = ?");
            queryParams.push(face_id);
        }

        const sql = `
            SELECT
                a.acceso_id AS face_id,
                a.embedding,
                a.usuario_id,
                u.tipo AS usuario_tipo,
                u.nombre
            FROM acceso a
            INNER JOIN usuario u ON u.usuario_id = a.usuario_id
            WHERE ${whereClauses.join(' AND ')}
            ORDER BY u.nombre ASC, u.tipo DESC, a.acceso_id ASC
        `;

        const [rows] = await pool.query(sql, queryParams);

        if (rows.length === 0) {
            return {
                msg: 'No matching user access records found in BD_SelAccesoUsuario',
                rows: []
            };
        }
        return {
            rows
        };
    } catch (err) {
        logger.error('Error in BD_SelAccesoUsuario:', err);
        return {
            msg: 'Error executing BD_SelAccesoUsuario',
            rows: []
        };
    }
};
const BD_GetImgUsr = async (params) => {
    const {usuario_id, local_id, pagina, tamano_pagina} = params

    const {rows:getUsrImg,total} = await BDgetUsuarioAccesos({ usuario_id, local_id, pagina, tamano_pagina });

    if (getUsrImg.length === 0 || getUsrImg.length == 'undefined') {
        return ({
            msg: 'Usuario no encontrado BDgetUsuarioAccesos',
            rows: 0,
            total:0
        });
    }
    return ({
        msg: 'ok',
        rows:getUsrImg,
        total
    });
}

/**
 * 
 * Camaras
 */
const BD_sel_Webcam = async (params) => {
    const { local_id, estado, camara_id, ubicacion, protocolo, pagina = 1, tamano_pagina = 10 } = params;

    if (!local_id) {
        return {
            msg: 'Sucursal no identificada',
            rows: [],
            total: 0
        };
    }

    const offset = (pagina - 1) * tamano_pagina;

    try {
        let where = [];
        let where_var = [];

        // Always filter by the user's branch
        where.push(`local_id = ?`);
        where_var.push(local_id);

        // Add optional filters
        if (camara_id) {
            where.push(`camara_id = ?`);
            where_var.push(camara_id);
        }
        if (estado) {
            where.push(`estado = ?`);
            where_var.push(estado);
        }
        if (ubicacion) {
            where.push(`ubicacion = ?`);
            where_var.push(ubicacion);
        }
        if (protocolo) {
            where.push(`protocolo = ?`);
            where_var.push(protocolo);
        }

        const where_full = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        // --- Count Query ---
        const countSql = `SELECT COUNT(*) as total FROM camara ${where_full}`;
        const [[{ total }]] = await pool.query(countSql, where_var);

        if (total === 0) {
            return {
                msg: 'ok',
                rows: [],
                total: 0
            };
        }

        // --- Data Query ---
        let sql = `SELECT 
                        camara_id,
                        nombre,
                        ubicacion,
                        estado,
                        local_id,
                        orden,
                        protocolo,
                        camara_hostname,
                        camara_port,
                        camara_user,
                        camara_pass
                    FROM 
                        camara
                    ${where_full}
                    ORDER BY camara.orden ASC
                    LIMIT ? OFFSET ?`;

        const queryParams = [...where_var, tamano_pagina, offset];
        const [rows] = await pool.query(sql, queryParams);

        return {
            msg: 'ok',
            rows,
            total
        };

    } catch (err) {
        logger.error('err BD_sel_Webcam:', err);
        return {
            msg: 'Error en BD_sel_Webcam',
            rows: [],
            total: 0
        };
    }
};
const BD_GetOnvifCameras = async () => {
    try {
        const sql = `SELECT
                        camara_id,
                        nombre,
                        ubicacion,
                        estado,
                        local_id,
                        orden,
                        protocolo,
                        camara_hostname,
                        camara_port,
                        camara_user,
                        camara_pass
                    FROM
                        camara
                    WHERE
                        protocolo = 'onvif' AND estado = 'activo'
                    ORDER BY
                        camara.orden ASC`;

        const [rows] = await pool.query(sql);

        if (rows.length === 0) {
            logger.info('No active ONVIF cameras found in the database.');
            return [];
        }

        return rows;

    } catch (err) {
        logger.error('Error in BD_GetOnvifCameras:', err);
        return []; // Return an empty array in case of an error
    }
};
const BDupdCamara = async (params) => {
    const { local_id, camara_id, nombre, ubicacion, estado, protocolo } = params;

    if (!local_id) {
        return { msg: 'Error - params: local_id is required', rows: 0 };
    }
    if (!camara_id) {
        return { msg: 'Error - params: camara_id is required', rows: 0 };
    }

    const setClauses = [];
    const values = [];

    if (nombre) {
        setClauses.push('nombre = ?');
        values.push(nombre);
    }
    if (ubicacion) {
        setClauses.push('ubicacion = ?');
        values.push(ubicacion);
    }
    if (estado) {
        setClauses.push('estado = ?');
        values.push(estado);
    }
    if (protocolo) {
        setClauses.push('protocolo = ?');
        values.push(protocolo);
    }

    if (setClauses.length === 0) {
        return { msg: 'No fields to update', rows: 0 };
    }

    values.push(camara_id);

    const sql = `UPDATE camara SET ${setClauses.join(', ')} WHERE camara_id = ?`;

    try {
        const [result] = await pool.query(sql, values);

        if (result.affectedRows === 0) {
            return { msg: 'Camara not found or no changes made', rows: 0 };
        }

        const row_usr = await BD_sel_Webcam({ local_id, camara_id });
        return {
            msg: 'ok',
            rows: row_usr.rows[0]
        };
    } catch (err) {
        logger.error(`Error BDupdCamara -> [${err}]`);
        return { msg: 'Error BDupdCamara', rows: 0 };
    }
}
const BD_getCamaraOptions = async () => {
    try {
        const connection = await pool.getConnection();
        const options = {};

        // Get ENUM values for 'ubicacion'
        const [ubicacionRows] = await connection.query("SHOW COLUMNS FROM `camara` LIKE 'ubicacion'");
        if (ubicacionRows.length > 0) {
            const ubicacionType = ubicacionRows[0].Type;
            options.ubicacion = ubicacionType.match(/'([^']+)'/g).map(val => val.replace(/'/g, ''));
        }

        // Get ENUM values for 'protocolo'
        const [protocoloRows] = await connection.query("SHOW COLUMNS FROM `camara` LIKE 'protocolo'");
        if (protocoloRows.length > 0) {
            const protocoloType = protocoloRows[0].Type;
            options.protocolo = protocoloType.match(/'([^']+)'/g).map(val => val.replace(/'/g, ''));
        }

        connection.release();
        return { msg: 'ok', options };
    } catch (err) {
        logger.error('Error in BD_getCamaraOptions:', err);
        return { msg: 'Error fetching camera options', options: {} };
    }
};

const BDAddFacesBulk = async (usuario_id, faces) => {
    if (!usuario_id || !faces || faces.length === 0) {
        return { msg: 'Error - params BDAddFacesBulk: usuario_id and faces array are required' };
    }

    const sql = `INSERT INTO acceso (
        usuario_id,
        embedding,
        mesh,
        img,
        perfil,
        similarity,
        fecha_acceso
    ) VALUES ?`;

    const values = faces.map(face => [
        usuario_id,
        JSON.stringify(face.embedding),
        JSON.stringify(face.mesh),
        face.imgName,
        face.perfil,
        face.similarity,
        new Date() // Set current timestamp for fecha_acceso
    ]);

    try {
        const [result] = await pool.query(sql, [values]);
        if (result.affectedRows === 0) {
            return { msg: 'Error inserting faces in bulk' };
        }
        return { msg: 'ok', affectedRows: result.affectedRows };
    } catch (err) {
        logger.error(`Error BDAddFacesBulk -> [${err}]`);
        return { msg: 'Error during bulk face insertion' };
    }
};

const BD_GetFacesForHumanMatcher = async () => {
    try {
        const sql = `
            SELECT
                a.acceso_id,
                a.img,
                a.usuario_id,
                a.human_embedding,
                a.embedding,
                u.nombre,
                u.tipo AS usuario_tipo
            FROM acceso a
            INNER JOIN usuario u ON u.usuario_id = a.usuario_id
            WHERE
                u.fecha_eliminacion IS NULL
                AND u.estado = 'activo'
                AND a.fecha_eliminacion IS NULL
                AND a.img IS NOT NULL
        `;

        const [rows] = await pool.query(sql);

        if (rows.length === 0) {
            return {
                msg: 'No faces found for Human Matcher initialization',
                rows: []
            };
        }
        return {
            rows
        };
    } catch (err) {
        logger.error('Error in BD_GetFacesForHumanMatcher:', err);
        return {
            msg: 'Error executing BD_GetFacesForHumanMatcher',
            rows: []
        };
    }
};

module.exports = {
    BDgetUsuario,
    BDdelUsuario,
    BDputUsuario,
    BDupdUsuario,
    BDaddLogin,

    BDupdAccesoImgCompreFace,
    BDgetAccesoUsuario,
    BDAddAccesoUsuario,
    BDupdAccesoUsuario,
    BDAddFacesBulk, // <-- Add new function here
    BD_SelAccesoUsuario,
    BD_ReportAccesos,
    BDAddAcceso,
    BDUnificaAcceso,
    BD_GetImgUsr,
    BDDeleteAcceso,

    BD_sel_Webcam,
    BD_GetOnvifCameras,
    BDupdCamara,
    BD_getCamaraOptions,
    BD_GetFacesForHumanMatcher
}