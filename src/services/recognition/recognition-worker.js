const { parentPort, threadId } = require('worker_threads');
const path = require('path');

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
}

const RecognitionOrchestrator = require('./recognition-orchestrator');
const logger = require('../../helpers/logger');
const { prepareImageForRecognition, cleanupTemporaryImage } = require('../../helpers/image-handler');

const recognitionOrchestrator = new RecognitionOrchestrator();

parentPort.on('message', async (task) => {
    const { imageBuffer, context } = task;
    let img;

    if (!imageBuffer || imageBuffer.length === 0) {
        logger.error(`Worker [${threadId}] received an invalid imageBuffer.`);
        parentPort.postMessage({ status: 'error', error: 'Invalid image buffer', context });
        return;
    }

    try {
        img = await prepareImageForRecognition(imageBuffer, `camera_${context.camera.camara_id}`);
        const fullContext = { ...context, img };

        const results = await recognitionOrchestrator.orchestrate(imageBuffer, fullContext);
        parentPort.postMessage({ status: 'finished', results, context: fullContext });
    } catch (error) {
        logger.error(`Worker [${threadId}] Error during recognition orchestration for camera [${context.camera.camara_id}]:`, error);
        parentPort.postMessage({ status: 'error', error: error.message, context });
    } finally {
        if (img) {
            await cleanupTemporaryImage(img);
        }
    }
});

logger.info(`Recognition worker threadId[${threadId}] started and is ready for tasks.`);
