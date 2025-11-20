const { response } = require('express');
// const path = require('path');
// const fs   = require('fs');

const { subirArchivo } = require('../helpers');
const logger = require('../helpers/logger');


const cargarArchivo = async (req, res = response, next) => {
    logger.debug(`---------------------------------------------------------- cargarArchivo`)

    req.fcargarArchivo = true;
    if (
        !req.fvalidarArchivoSubir
    ) {
        logger.error(`Error : fvalidarArchivoSubir`)
        req.fcargarArchivo = false;
        next();
        return
    }

    if (
        req.files.archivo.length === 0 ||
        req.files.archivo.length > 1
    ) {
        logger.error(`Error subir archivo length`)

        req.fcargarArchivo = false;
        next();
        return
    }

    let imgFileName;
    try {
        imgFileName = await subirArchivo(req.files);
        logger.debug(`subirArchivo  <- [${imgFileName}]`)
    } catch (err) {
        logger.error(`Error subirArchivo [${imgFileName}]: [${err}]`)

        req.fcargarArchivo = false;
        req.subirArchivoMSG = err;
        next();
        return
    }

    if (!imgFileName) {
        req.fcargarArchivo = false;
        next();
        return
    }


    req.imgFileName = imgFileName;
    next();
    return
}
module.exports = {
    cargarArchivo
}