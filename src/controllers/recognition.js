const { response } = require('express');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../helpers/logger');
const { getQueue, PRIORITY_LEVELS } = require('../services/queue/queue-service');
const recognitionQueue = getQueue();

const faceMatchImg = async (req, res = response) => {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.archivo) {
        logger.warn('faceMatchImg: No file was uploaded.');
        return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const uploadedFile      = req.files.archivo;
    const imageBuffer       = fs.readFileSync(uploadedFile.tempFilePath);
    const originalFileName  = uploadedFile.name;

    if (!imageBuffer || imageBuffer.length === 0) {
        logger.warn('faceMatchImg: Attempted to process an empty file.');
        return res.status(400).json({ error: 'The uploaded file is empty.' });
    }

    const { camara_id, camara_name, camara={} } = req.body;
    const jobId = uuidv4();

    logger.info(`FORM --> camera[${camara_id}] Job[${jobId}] imageBuffer...`);
    try {
        const context = {
            jobId,
            camera: {
                camara_id: camara_id,
                ...camara
            },
            imageName: originalFileName,
        };

        logger.info(`ADD Task --> Job[${jobId}] camera[${camara_id}] PRIORITY[${PRIORITY_LEVELS.NORMAL}] imageBuffer...`);
        recognitionQueue.addTask(imageBuffer, context, PRIORITY_LEVELS.NORMAL);

        return res.status(202).json({
            message: 'Recognition task has been queued successfully.',
            fileName: originalFileName,
            jobId: jobId
        });

    } catch (error) {
        logger.error(`Error in faceMatchImg endpoint: ${error}`);
        return res.status(500).json({ msg: 'Internal server error while queueing face recognition task.' });
    }
};

module.exports = {
    faceMatchImg
}
