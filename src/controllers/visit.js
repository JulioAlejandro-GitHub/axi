const { BDputUsuario, BDAddAcceso } = require('../database/usuario');
const faceCache = require('../helpers/face-cache');
const logger = require('../helpers/logger');
const { addSubjects, addFaceCollection } = require('../services/recognition/engines/compreface-engine.js');
const { encryptData } = require('../helpers/crypto-helper');


const registerAcceso = async (visitData) => {
    const {
        personasIdentificadas,
        personasDesconocidas,
        imgFileName,
        camara_id
    } = visitData;
    logger.info(`registerAcceso --> Identificadas[${personasIdentificadas.length}] Desconocidas[${personasDesconocidas.length}] camara_id[${camara_id}]`)

    let newFacesAdded = false;

    // Handle identified people
    if (personasIdentificadas && personasIdentificadas.length > 0) {
        for (const p of personasIdentificadas) {
            logger.info(`personasIdentificadas BDAddAcceso -> usuario_id[${p.usuario_id}][${p.img}]`)
            const newEmbedding = await BDAddAcceso({
                usuario_id  : p.usuario_id,
                tipo        : 'identificado',
                camara_id   : camara_id,
                similarity  : p.similarity,
                img         : p.img,
                perfil      : p.perfil,
                embedding   : encryptData(p.embedding),
                human_embedding   : encryptData(p.human_embedding),
                mesh              : encryptData(p.mesh)
            });
            if (newEmbedding.insertId) {
                newFacesAdded = true;

                logger.info(`p.fuente  sw recognition --> [${p.fuente.length}]`)
                    if (p.fuente.length >= 2) {
                        /**
                         *  tiene dos fuentes
                         *  subir solo una imagen ...
                         * */
                    }
                // p.fuente = ['compreface', 'human'] || ['compreface'] || ['human']
                // if (p.fuente.includes('compreface')) {
                    logger.info(`addFaceCollection -> usuario_id[${p.usuario_id}][${p.img}]`)
                    await addFaceCollection({ subjectId: p.usuario_id, imgName: p.img, acceso_id:newEmbedding.insertId });
                // }
            }
        }
    }

    // Handle unknown people
    if (personasDesconocidas && personasDesconocidas.length > 0) {
        for (const p of personasDesconocidas) {
            // Create a new user account for the unknown person
            const newUser = await BDputUsuario({
                nombre  : 'visita',
                tipo    : 'desconocido',
                email   : `desconocido_${Date.now()}@desconocido.cl`, // Ensure unique email
                password_bcryptjs: '0'
            });
            if (newUser.rows && newUser.rows.usuario_id) {
                logger.info(`NEW Desconocido BDAddAcceso -> usuario_id[${newUser.rows.usuario_id}][${p.img}]`)

                const newEmbedding = await BDAddAcceso({
                    usuario_id  : newUser.rows.usuario_id,
                    tipo        : 'desconocido',
                    camara_id   : camara_id,
                    similarity  : p.similarity,
                    embedding   : encryptData(p.embedding),
                    img         : p.img,
                    perfil      : p.perfil,
                    mesh        : encryptData(p.mesh)
                });
                if (newEmbedding.insertId) {
                    newFacesAdded = true;

                    logger.info(`p.fuente sw recognition --> [${p.fuente.length}]`)
                    if (p.fuente.length >= 2) {
                        /**
                         *  tiene dos fuentes
                         *  subir solo una imagen ...
                         * */
                    }


                    // p.fuente = ['compreface', 'human'] || ['compreface'] || ['human']
                    // if (p.fuente.includes('compreface')) {
                        logger.info(`addSubjects & addFaceCollection -> usuario_id[${newUser.rows.usuario_id}] acceso_id[${newEmbedding.insertId}] [${p.img}]`)
                        await addSubjects(newUser.rows.usuario_id);
                        await addFaceCollection({ subjectId: newUser.rows.usuario_id, imgName: p.img, acceso_id:newEmbedding.insertId });
                    // }
                }
            }
        }
    }

    if (newFacesAdded) {
        await faceCache.refresh();
    }

    return { msg: `Acceso registration complete` };
};

module.exports = {
    registerAcceso
};
