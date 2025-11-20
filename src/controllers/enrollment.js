const { response } = require('express');
const fs = require('fs');
const logger = require('../helpers/logger');
const RecognitionOrchestrator = require('../services/recognition/recognition-orchestrator');
const { registerAcceso } = require('./visit');
const { prepareImageForRecognition, cleanupTemporaryImage } = require('../helpers/image-handler');

const enrollUser = async (req, res = response) => {
    if (!req.files || Object.keys(req.files).length === 0 || !req.files.archivo) {
        logger.warn('enrollUser: No file was uploaded.');
        return res.status(400).json({ error: 'No file was uploaded.' });
    }

    const { user_id } = req.body;
    if (!user_id) {
        logger.warn('enrollUser: user_id is missing.');
        return res.status(400).json({ error: 'user_id is required.' });
    }

    const uploadedFile = req.files.archivo;
    const imageBuffer = fs.readFileSync(uploadedFile.tempFilePath);
    let img;

    if (!imageBuffer || imageBuffer.length === 0) {
        logger.warn('enrollUser: Attempted to process an empty file.');
        return res.status(400).json({ error: 'The uploaded file is empty.' });
    }

    try {
        img = await prepareImageForRecognition(imageBuffer, `enrollment_${user_id}`);
        const context = {
            camera: {
                camara_id: 8,
                camara_name: 'enrollment'
            },
            img,
        };

        const orchestrator = new RecognitionOrchestrator();
        const recognitionResult = await orchestrator.orchestrate(imageBuffer, context);

        if (recognitionResult.personasDetectadas !== 1) {
            logger.warn(`enrollUser: Expected 1 face, but found ${recognitionResult.personasDetectadas}.`);
            return res.status(409).json({ error: `Expected 1 face, but found ${recognitionResult.personasDetectadas}.` });
        }

        if (recognitionResult.personasIdentificadas.length > 0) {
            logger.warn(`enrollUser: Duplicate face detected for user_id: ${user_id}.`);
            return res.status(409).json({ error: `This face is already registered to another user.` });
        }

        await registerAcceso({
            ...recognitionResult,
            camara_id: 8
        }).catch(err => logger.error('Error registering visit in background:', err));

        logger.info(`enrollUser: Successfully enrolled user_id: ${user_id}.`);
        return res.status(201).json({
            message: 'User enrolled successfully.'
        });

    } catch (error) {
        logger.error(`Error in enrollUser endpoint for user_id ${user_id}: ${error}`);
        return res.status(500).json({ msg: 'Internal server error while enrolling user.' });
    } finally {
        if (img) {
            await cleanupTemporaryImage(img);
        }
    }
};

module.exports = {
    enrollUser
};
