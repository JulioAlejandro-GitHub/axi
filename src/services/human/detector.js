/**
 * @fileoverview Face detection using the Human library.
 */
// const tf = require('@tensorflow/tfjs-node'); // can also use '@tensorflow/tfjs-node-gpu' if you have environment with CUDA extensions
const Human = require('@vladmandic/human').default;

const humanConfig = require('./config');
const logger = require('../../helpers/logger');




/**
 * The Human instance.
 * @type {Human}
 */
let human = null;
let initPromise = null;

human = new Human(humanConfig);
const sharp = require('sharp');

/**
 * Initializes the Human instance by creating it and loading the models. This function is idempotent.
 */
async function initialize() {
    if (initPromise) {
        return initPromise;
    }
    initPromise = (async () => {
        logger.info('Initializing Human library and loading models...');

        // Defer require() and instantiation to prevent blocking the event loop on startup.
        await human.load();
        logger.info('Human models loaded successfully.');
    })();
    return initPromise;
}

async function detect(buffer) {
    // logger.info(`Human detect --> buffer`);
    // Ensure that the models are loaded before proceeding.
    // await initialize();

    try {
        // Use sharp to ensure the image is in a format (like JPEG) that TensorFlow can handle.
        const jpegBuffer = await sharp(buffer).jpeg().toBuffer();

        const tensor = human.tf.node.decodeImage(jpegBuffer, 3);
        const result = await human.detect(tensor, humanConfig);
        // human.tf.dispose(tensor);
        return result;
    } catch (error) {
        logger.error('Error in Human face detection:');
        throw error;
    }
}

/**
 * Gets the embedding/descriptor for a face in an image buffer.
 * @param {Buffer} buffer The image buffer.
 * @returns {Promise<Array<number>|null>} The embedding vector or null if no face is found.
 * 
 * 
 * hay muchos rostros en la imagen ...
 */
async function getEmbedding(buffer) {
    // await initialize();
    const result = await detect(buffer);
    return result?.face?.[0]?.embedding || null;
}

/**
 * Matches two face descriptors.
 * @param {Array<number>} desc1 The first descriptor.
 * @param {Array<number>} desc2 The second descriptor.
 * @returns {Promise<number>} The similarity score.
 */
async function match(desc1, desc2) {
    // await initialize();
    if (!human) {
        logger.error('Human instance not initialized, cannot perform match.');
        return 0;
    }
    return human.match(desc1, desc2);
}

module.exports = {
    human,
    detect,
    initialize,
    getEmbedding,
    match
};
