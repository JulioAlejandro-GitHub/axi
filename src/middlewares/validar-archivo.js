const { response } = require("express")
const logger = require("../helpers/logger");

const validarArchivoSubir = (req, res = response, next) => {
    req.fvalidarArchivoSubir = true;
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.archivo) {
        logger.warn('No file was uploaded - validarArchivoSubir');
        req.fvalidarArchivoSubir = false;
        // return res.status(400).json({
        //     msg: 'No hay archivos que subir - validarArchivoSubir'
        // });
    }
    next();
    // return req.fvalidarArchivoSubir;
    
}

module.exports = {
    validarArchivoSubir
}