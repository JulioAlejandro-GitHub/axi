/**
 * verificar permisos de ejecucion antes de ir a BD
 */
// const { response } = require('express');
const { response, request } = require('express');
const bcryptjs = require('bcryptjs');
// const path = require('path');
// const fs = require('fs');
const { decryptData } = require('../helpers/crypto-helper');   //decryptData(face.mesh),

// const { handleAddFaceCollection, handleDeleteFaceCollection } = require('./compreface');
const { addFaceCollection, delFaceCollection } = require('../services/recognition/engines/compreface-engine.js');

const faceCache = require('../helpers/face-cache');

const {
    BDgetAccesoUsuario,
    BDgetUsuario,
    BDdelUsuario,
    BDputUsuario,
    BDDeleteAcceso,
    BDAddFacesBulk,
    BD_ReportAccesos,
    BD_sel_Webcam,
    BD_GetImgUsr,
    BDUnificaAcceso,
    BDupdUsuario,
    BDupdAccesoUsuario,
    BDupdCamara,
    BD_getCamaraOptions
} = require('../database/usuario');
const { validateCameras } = require('../helpers/onvif-validator');
// const { startHlsStream } = require('../helpers/ffmpeg-hls-streamer');
const logger = require('../helpers/logger');

const getUsuario = async (req, res = response, next) => {
    logger.debug(`--------------------------------------------------------- controller getUsuario`)
    const { id=0, ids=[], email, nombre } = req.params

    // if (!id) {
        /**
         * se requieren todos los usuarios, para reporte
         * verficar si usuario esta autenticado 
         * login y si es administrador
         * paginar
         */
    // }

    try {
        // const getUsr = await findUserById(id);
        const getUsr = await BDgetUsuario({ id, ids });
        return res.json({
            msg: 'ok',
            getUsr
        });
    } catch (err) {
        logger.error('err getUsuario_BD:', err)
        return res.status(400).json({
            msg: 'getUsuario_BD error'
        });
    }
}
const delUsuario = async (req, res = response, next) => {
    logger.debug(`--------------------------------------------------------- controller delUsuario`)
    const { id, nombre } = req.body

    if (!id) {
        logger.error('err delUsuario:id')
        return res.status(400).json({
            msg: 'delUsuario error id'
        });
    }

    try {
        logger.debug(`BDdelUsuario -> params[${id}]`)
        const delUsr = await BDdelUsuario({ id });
        logger.debug(`             <- [${delUsr}]`)

        return res.status(200).json({
            delUsr
        });
    } catch (err) {
        logger.error('err delUsuario:', err)
        return res.status(400).json({
            msg: 'delUsuario error'
        });
    }
}
const putUsuario = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller putUsuario`)
    const { 
        PerfilIzquierdo, PerfilDerecho, PerfilFrontal,
        embeddingPerfilIzquierdo, embeddingPerfilDerecho, embeddingPerfilFrontal,
        meshPerfilIzquierdo, meshPerfilDerecho, meshPerfilFrontal,
        existeSimilarity } = req;
    const { nombre, password, tipo, email, gender, ...resto } = req.body;

    /**
     * en el caso que el usuario no es administador
     * debe ser almenos de su empresa y local
     */
    let local_id = 1; // falta pasar el parametro

    logger.debug(`-- putUsuario existeSimilarity[${existeSimilarity}]`)

    if (password) {
        // Encriptar la contraseña
        const salt = bcryptjs.genSaltSync();
        resto.password = bcryptjs.hashSync(password, salt);
    }
    /**
     * buscar si existe el usuario... email
     */
    logger.debug(`BDgetUsuario -> email[${email}]`)
    const row_usr = await BDgetUsuario({ email })
    logger.debug(`BDgetUsuario <- [${row_usr.msg}]`)

    if (row_usr.msg == 'ok') { // encontrado
        return {
            msg: `Error - El email ya existe`,
            rows: 0
        }
    }

    logger.debug(`BDputUsuario -> [${nombre}][${tipo}][${gender}]`)
    const usuario = await BDputUsuario({
        nombre,
        tipo,
        email,
        password_bcryptjs: resto.password,
        local_id,
        gender
    });

    // --- Bulk add faces ---
    if (usuario.rows.usuario_id) {
        const facesToInsert = [];
        if (PerfilIzquierdo && embeddingPerfilIzquierdo) {
            facesToInsert.push({ embedding: embeddingPerfilIzquierdo, mesh: meshPerfilIzquierdo, imgName: PerfilIzquierdo, perfil: 'left' });
        }
        if (PerfilDerecho && embeddingPerfilDerecho) {
            facesToInsert.push({ embedding: embeddingPerfilDerecho, mesh: meshPerfilDerecho, imgName: PerfilDerecho, perfil: 'right' });
        }
        if (PerfilFrontal && embeddingPerfilFrontal) {
            facesToInsert.push({ embedding: embeddingPerfilFrontal, mesh: meshPerfilFrontal, imgName: PerfilFrontal, perfil: 'front' });
        }

        if (facesToInsert.length > 0) {
            logger.debug(`Bulk inserting [${facesToInsert.length}] faces for user_id [${usuario.rows.usuario_id}]`);
            const bulkResult = await BDAddFacesBulk(usuario.rows.usuario_id, facesToInsert);
            logger.debug(`                   <- [${bulkResult.msg}]`);
        }
    }

    return {
        msg: usuario.msg,
        rows: usuario.rows
    }
}
const updUsuario = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller updUsuario`)
    const { usuario_id, nombre, tipo, estado, email, password, local_id, gender } = req.body;

    // TODO: Validate that the user making the request has permission to update this user.

    const updateData = { usuario_id, nombre, tipo, estado, email, local_id, gender };

    if (password) {
        const salt = bcryptjs.genSaltSync();
        updateData.password_bcryptjs = bcryptjs.hashSync(password, salt);
    }

    try {
        const result = await BDupdUsuario(updateData);
        if (result.msg === 'ok') {
            return res.status(200).json({ msg: 'User updated successfully.', user: result.rows });
        } else {
            return res.status(400).json({ msg: result.msg });
        }
    } catch (error) {
        logger.error('Error in updUsuario controller:', error);
        return res.status(500).json({ msg: 'Internal server error.' });
    }
}




const getReportAccesos = async (req = request, res = response) => {
    logger.debug(`--------------------------------------------------------- controller getReportAccesos`);
    let { pagina, tipos } = req.body;

    const { uid, local_id } = req.user;
    logger.debug(`**** Report requested by user UID: ${uid}, local_id: ${local_id}`);
    const tamano_pagina = 10;

    try {
        logger.debug(`BD_ReportAccesos -> tipos[${tipos}] pagina[${pagina}] tamano_pagina[${tamano_pagina}]`);
        const { rows: groupedByUsuario, total } = await BD_ReportAccesos({ local_id, pagina, tipos, tamano_pagina });
        logger.debug(`                 <- Found [${groupedByUsuario.length}] user groups with a total of [${total}] matching users.`);

        // The data is now pre-grouped by the database query.
        // The 'accesos' field might be a JSON string or an object, so we handle both cases.
        const results = groupedByUsuario.map(user => {
            let parsedAccesos;
            if (typeof user.accesos === 'string') {
                try {
                    // If it's a string, parse it
                    parsedAccesos = JSON.parse(user.accesos || '[]');
                } catch (e) {
                    logger.error(`Failed to parse 'accesos' JSON for user ${user.usuario_id}:`, e);
                    parsedAccesos = []; // Default to empty array on parsing error
                }
            } else {
                // If it's not a string, it's likely already an object (or null/undefined)
                parsedAccesos = user.accesos || [];
            }
            return {
                ...user,
                accesos: parsedAccesos
            };
        });

        const totalPages = Math.ceil(total / tamano_pagina);
        const tiposDisponibles = ['socio', 'empleado', 'familia', 'desconocido', 'ladron'];

        return res.json({
            report: {
                results: results,
                totalRecords: total,
                totalPages: totalPages,
                currentPage: pagina || 1,
                filterOptions: {
                    tipos: tiposDisponibles
                }
            }
        });

    } catch (err) {
        logger.error('err getReportAccesos:', err);
        return res.status(500).json({ msg: 'getReportAccesos error' });
    }
};
const updUnificaAcceso = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller unificaacceso`);
    const { allVisitSelect } = req.body;

    if (!allVisitSelect || allVisitSelect.length < 2) {
        return res.status(400).json({
            msg: `Debe seleccionar al menos 2 Acceso para unificar.`
        });
    }

    // const primary_user_id = allVisitSelect[allVisitSelect.length -1].id; // este tiene que ser el menor....
    // const secondary_user_ids = allVisitSelect.slice(0,allVisitSelect.length-1).map(v => v.id);
    const primary_user_id = allVisitSelect[0].id; // este tiene que ser el menor....
    const secondary_user_ids = allVisitSelect.slice(1,allVisitSelect.length).map(v => v.id);

    //logger.debug(`Unifica Acceso --> primary_user_id[${primary_user_id}] secondary_user_ids[${secondary_user_ids}]`)
    /**
     * esto podria quedar en BD...
     */
    try {
        const result = await BDUnificaAcceso({ primary_user_id, secondary_user_ids });
        if (result.msg === 'ok') {
            return res.status(200).json({ msg: 'Acceso unificadas correctamente.' });
        } else {
            return res.status(500).json({ msg: 'Error al unificar las Acceso.' });
        }
    } catch (error) {
        logger.error('Error in updUnificaAcceso:', error);
        return res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};
const editorAccesos = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller editorAccesos`);
    const { acceso_id, option } = req.body;

    if (!acceso_id || !option) {
        return res.status(400).json({
            msg: `Debe seleccionar una opcion.`
        });
    }

    try {
        let result;

        const {rows: getAcceso} = await BDgetAccesoUsuario({ acceso_id });

        // Check if the option is for reassigning a user
        if (option.startsWith('otro:')) {
            const parts = option.split(':');
            const nuevo_usuario_id = parseInt(parts[1], 10);

            if (isNaN(nuevo_usuario_id)) {
                logger.error(`----------------------------ID de usuario de destino no válido.`);
                return res.status(400).json({ msg: 'ID de usuario de destino no válido.' });
            }

            result = await BDupdAccesoUsuario({ acceso_id, usuario_id: nuevo_usuario_id });
            if (result.msg === 'ok') {
                logger.debug(`Acceso reasignado correctamente --> acceso_id[${acceso_id}] usr_actual[${getAcceso[0].usuario_id}] to usr_nuevo[${nuevo_usuario_id}] img_compreface[${getAcceso[0].img_compreface}]`);

                /**
                 * eliminar img del usuario original si existe en compreface
                 */
                if (getAcceso[0].img_compreface) {
                    logger.debug(`delFaceCollection face to existing user -> acceso_id[${acceso_id}] usuario_id[${getAcceso[0].usuario_id}][${getAcceso[0].img_compreface}]`)
                    await delFaceCollection({image_id: getAcceso[0].img_compreface})
                }

                /**
                 * Agregar imagen ReAsignada ...
                 */
                logger.debug(`addFaceCollection face to existing user -> usuario_id[${nuevo_usuario_id}][${getAcceso[0].img}]`)
                await addFaceCollection({ subjectId: nuevo_usuario_id, imgName: getAcceso[0].img });

                faceCache.refresh();
                return res.status(200).json({ 
                    msg: 'Acceso reasignado correctamente.',
                    id_usr_actual: getAcceso[0].usuario_id,
                    id_usr_destino: nuevo_usuario_id,
                });
            }
        } else {
            // Handle other simple options like 'delete'
            switch (option) {
                case 'delete':
                    result = await BDDeleteAcceso({ acceso_id });
                    if (result.msg === 'ok') {
                        logger.debug(`Acceso eliminado correctamente --> acceso_id[${acceso_id}] img_compreface[${getAcceso[0].img_compreface}]`);

                        /**
                         * eliminar img del usuario original si existe en compreface
                         */
                        if (getAcceso[0].img_compreface) {
                            logger.debug(`delFaceCollection face to existing user -> acceso_id[${acceso_id}] usuario_id[${getAcceso[0].usuario_id}][${getAcceso[0].img}]`)
                            await delFaceCollection({image_id: getAcceso[0].img_compreface})
                        }

                        faceCache.refresh();
                        return res.status(200).json({ msg: 'Acceso eliminado correctamente.' });
                    }
                    break;
                default:
                    logger.error(`--------------------------Opción no válida.`);
                    return res.status(400).json({ msg: 'Opción no válida.' });
            }
        }

        logger.error(`-------------------------Error al procesar la solicitud.`);

        // If we fall through, it means the database operation failed
        return res.status(500).json({ msg: 'Error al procesar la solicitud.' });

    } catch (error) {
        logger.error('Error in editorAccesos:', error);
        logger.error(`-------------------------Error interno del servidor.`);

        return res.status(500).json({ msg: 'Error interno del servidor.' });
    }
};

/**
 * esto es GET EDITIN ACCESO... 
 * ActivityLog nos trae aqui con boton editar...
 * ES Editar Actividad de acceso...
 */
const getEditImg = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller getEditImg`);
    const { usuario_id, pagina } = req.body;
    logger.debug(`usuario_id -> [${usuario_id}]`);

    const { uid, local_id } = req.user;
    logger.debug(`Edit requested by user UID: ${uid}, local_id: ${local_id}`);
    if (!usuario_id || isNaN(usuario_id)) {
        logger.error('err getEditImg --> req.body.id');
        return res.status(400).json({
            msg: `Error: Invalid user ID.`
        });
    }

    const tamano_pagina = 12;

    try {
        logger.debug(`BD_GetImgUsr -> usuario_id[${usuario_id}] local_id[${local_id}] pagina[${pagina}] tamano_pagina[${tamano_pagina}]`);
        const { rows: userFaces, total } = await BD_GetImgUsr({ usuario_id, local_id, pagina, tamano_pagina });
        logger.debug(`             <- [${userFaces.length}]`);
        logger.debug(`             <- total [${total}]`);

        if (!userFaces || userFaces.length === 0) {
            return res.status(404).json({ msg: 'No images found for this user.' });
        }

        const totalPages = Math.ceil(total / tamano_pagina);
        logger.debug(`             <- totalPages[${totalPages}]`);

        // Extract user details from the first record (they are the same for all records)
        const userDetails = {
            usuario_id: userFaces[0].usuario_id,
            usuario_nombre: userFaces[0].usuario_nombre,
            usuario_tipo: userFaces[0].usuario_tipo,
            fecha_creacion: userFaces[0].fecha_creacion,
            local_nombre: userFaces[0].local_nombre,
            empresa_nombre: userFaces[0].empresa_nombre,
            ultimo_acceso: userFaces[0].fecha_acceso,
            profile_image: userFaces[userFaces.length - 1].img // Use the last image as the profile image
        };

        // embedding: decryptData(face.embedding),

        // Map the faces to a cleaner format
        const faces = userFaces.map(face => ({
            img: face.img,
            camara_nombre: face.camara_nombre,
            similarity: face.similarity,
            fecha_acceso: face.fecha_acceso,
            acceso_tipo: face.acceso_tipo,
            camara_ubicacion: face.camara_ubicacion,
            acceso_id: face.acceso_id,
            // mesh: face.mesh, // se puede buscar en click del boton... 
            mesh: JSON.stringify(decryptData(face.mesh)),
            usuario_id:face.usuario_id,
            // We don't need to send back all user details with every single face record
        }));

        return res.json({
            user: userDetails,
            faces: faces,
            totalPages: totalPages,
            currentPage: pagina || 1
        });

    } catch (err) {
        logger.error('Error in getEditImg:', err);
        return res.status(500).json({ msg: 'An internal error occurred while fetching user images.' });
    }
}

const getUsersByBranch = async (req = request, res = response) => {
    logger.debug(`--------------------------------------------------------- controller getUsersByBranch`);
    const { uid, local_id } = req.user;
    const { pagina = 1 } = req.body;
    const tamano_pagina = 100;

    try {
        const { rows: users, total } = await BDgetUsuario({ local_id, pagina, tamano_pagina });

        if (!users) {
            // BDgetUsuario returns rows: [] if not found, so we check for that
            return res.json({ results: [], totalPages: 0 });
        }

        const result = users.map(user => ({
            ID: user.usuario_id,
            Nombre: user.nombre,
            // Email: user.email,
            Tipo: user.usuario_tipo,
            Estado: user.estado,
            Gender: user.gender,
            profile_image: user.profile_image
        }));

        const totalPages = Math.ceil(total / tamano_pagina);

        return res.json({
            results: result,
            totalPages: totalPages,
        });

    } catch (err) {
        logger.error('err getUsersByBranch:', err);
        return res.status(500).json({ msg: 'Error fetching users by branch.' });
    }
};






const getWebCam = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller getWebCam`);
    const { uid, local_id } = req.user;

    try {
        logger.info(`Fetching cameras for local_id: [${local_id}]`);
        const getWebcamResult = await BD_sel_Webcam({ local_id });

        if (getWebcamResult.msg !== 'ok' || !getWebcamResult.rows) {
            logger.warn(`No cameras found in DB for local_id: ${local_id}`);
            return res.status(404).json({ webcams: [] });
        }

        logger.info(`Found ${getWebcamResult.rows.length} cameras in DB. Starting ONVIF validation.`);

        // Validate cameras to check their compatibility and get stream URIs
        const validatedWebcams = await validateCameras(getWebcamResult.rows);

        logger.info(`ONVIF validation complete. Returning validated cameras as JSON.`);
        res.json({ webcams: validatedWebcams });

    } catch (err) {
        logger.error('Error in getWebCam controller:', err);
        return res.status(500).json({ msg: 'getWebCam controller error' });
    }
};
const getCamaras = async (req = request, res = response) => {
    logger.debug(`--------------------------------------------------------- controller getCamaras`);
    const { uid, local_id } = req.user;
    const { pagina = 1 } = req.body;
    const tamano_pagina = 10;

    try {
        const { rows: camaras, total } = await BD_sel_Webcam({ local_id, pagina, tamano_pagina });

        if (!camaras) {
            return res.json({ results: [], totalPages: 0 });
        }

        const result = camaras.map(cam => ({
            ID: cam.camara_id,
            Nombre: cam.nombre,
            Ubicacion: cam.ubicacion,
            Estado: cam.estado,
            Protocolo: cam.protocolo
        }));

        const totalPages = Math.ceil(total / tamano_pagina);

        return res.json({
            results: result,
            totalPages: totalPages,
        });

    } catch (err) {
        logger.error('err getCamaras:', err);
        return res.status(500).json({ msg: 'Error fetching Camaras by branch.' });
    }
};
const updCamara = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller updCamara`)
    const { camara_id, nombre, ubicacion, estado, protocolo } = req.body;
    const { uid, local_id } = req.user;
    const cameraService = require('../services/camera/camera-service');

    // TODO: Validate that the user making the request has permission to update this user.

    const updateData = { local_id, camara_id, nombre, ubicacion, estado, protocolo };

    try {
        const result = await BDupdCamara(updateData);
        if (result.msg === 'ok') {
            // Notify the camera service of the status change
            cameraService.updateCameraStatus(camara_id, estado);
            return res.status(200).json({ msg: 'User updated successfully.', user: result.rows });
        } else {
            return res.status(400).json({ msg: result.msg });
        }
    } catch (error) {
        logger.error('Error in updUsuario controller:', error);
        return res.status(500).json({ msg: 'Internal server error.' });
    }
};
const getLiveStream = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller getLiveStream`);
    const { uid, local_id } = req.user;
    const { pagina = 1, ubicacion, estado, protocolo } = req.body;
    const tamano_pagina = 3; // Set page size to 3 as requested
    const cameraService = require('../services/camera/camera-service');

    try {
        const filterParams = {
            local_id,
            pagina,
            tamano_pagina,
            ubicacion: ubicacion || null,
            estado: estado || null,
            protocolo: protocolo || null,
        };

        logger.info(`Fetching cameras for live stream with params:`, filterParams);
        const { rows: cameras, total } = await BD_sel_Webcam(filterParams);

        if (!cameras || cameras.length === 0) {
            logger.warn(`No cameras found in DB for the given filters.`);
            return res.json({
                cameras: [],
                totalPages: 0,
                currentPage: pagina
            });
        }

        logger.info(`Found ${cameras.length} cameras in DB. Starting ONVIF validation for live stream.`);
        const validatedWebcams = await validateCameras(cameras);

        // // Start HLS stream for compatible cameras
        // validatedWebcams.forEach(camera => {
        //     if (camera.isCompatible && camera.protocolo === 'onvif') {
        //         logger.info(`[HLS] Initiating stream for compatible camera ID: ${camera.camara_id}`);
        //         cameraService.startHlsStreamForCamera(camera);
        //         camera.hlsStreamUrl = `/public/streams/cam_${camera.camara_id}/stream.m3u8`;
        //     }
        // });

        const totalPages = Math.ceil(total / tamano_pagina);

        logger.info(`ONVIF validation and HLS initiation complete. Returning paginated and filtered cameras.`);
        res.json({
            cameras: validatedWebcams,
            totalPages,
            currentPage: pagina,
            totalRecords: total
        });

    } catch (err) {
        logger.error('Error in getLiveStream controller:', err);
        return res.status(500).json({ msg: 'getLiveStream controller error' });
    }
};
const getCamaraOptions = async (req, res = response) => {
    logger.debug(`--------------------------------------------------------- controller getCamaraOptions`);
    try {
        const result = await BD_getCamaraOptions();
        if (result.msg === 'ok') {
            return res.status(200).json(result.options);
        } else {
            return res.status(500).json({ msg: result.msg });
        }
    } catch (error) {
        logger.error('Error in getCamaraOptions controller:', error);
        return res.status(500).json({ msg: 'Internal server error.' });
    }
};


module.exports = {
    getUsuario,
    delUsuario,
    putUsuario,
    updUsuario,
    getWebCam,
    getEditImg,
    getUsersByBranch,
    getCamaras,
    updCamara,
    getLiveStream,
    getCamaraOptions,
    updUnificaAcceso,
    getReportAccesos,
    editorAccesos
}