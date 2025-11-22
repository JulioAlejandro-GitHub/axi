const { response } = require('express');
const { BD_sel_Webcam } = require('../database/usuario');
const cameraService = require('../services/camera/camera-service');
const logger = require('../helpers/logger');

/**
 * Inicia un stream HLS on-demand para la cámara indicada y devuelve la URL HLS.
 */
const startStream = async (req, res = response) => {
    const { camara_id } = req.body;
    const { local_id } = req.user;

    try {
        const { rows, total } = await BD_sel_Webcam({ local_id, camara_id, tamano_pagina: 1, pagina: 1 });
        if (!rows || rows.length === 0 || total === 0) {
            return res.status(404).json({ msg: 'Cámara no encontrada para esta sucursal.' });
        }

        const camera = rows[0];
        cameraService.startHlsStreamForCamera(camera);

        const hlsUrl = `/public/streams/cam_${camera.camara_id}/stream.m3u8`;
        return res.json({ hlsUrl });
    } catch (error) {
        logger.error('Error al iniciar el stream HLS:', error);
        return res.status(500).json({ msg: 'No se pudo iniciar el stream HLS.' });
    }
};

module.exports = {
    startStream,
};