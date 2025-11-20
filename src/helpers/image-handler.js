const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const tempDir = path.join(__dirname, '../../temp');

/**
 * Prepares an image for recognition by saving it to a temporary file.
 * @param {Buffer} imageBuffer - The image buffer to process.
 * @param {string} [prefix='image'] - A prefix for the temporary file name.
 * @returns {Promise<object>} An object containing image metadata.
 */
async function prepareImageForRecognition(imageBuffer, prefix = 'image') {
    try {
        // Ensure temp directory exists
        await fs.mkdir(tempDir, { recursive: true });

        const imgOriginalName = `${prefix}_${uuidv4()}.jpg`;
        const tempFilePath = path.join(tempDir, imgOriginalName);
        const imgPathRelative = `./temp/${imgOriginalName}`;

        await fs.writeFile(tempFilePath, imageBuffer);

        return {
            PathRelative: imgPathRelative,
            name: imgOriginalName,
            buffer: imageBuffer,
            tempFilePath,
        };
    } catch (error) {
        logger.error('Error preparing image for recognition:', error);
        throw new Error('Failed to prepare image for recognition.');
    }
}

/**
 * Cleans up the temporary image file.
 * @param {object} img - The image metadata object from prepareImageForRecognition.
 */
async function cleanupTemporaryImage(img) {
    if (img && img.tempFilePath) {
        try {
            logger.warn(`await fs.unlink: ${img.tempFilePath}`);
            await fs.unlink(img.tempFilePath);
        } catch (error) {
            // Log error if cleanup fails, but don't throw, as it's not a critical failure.
            logger.warn(`Failed to clean up temporary image: ${img.tempFilePath}`, error);
        }
    }
}

module.exports = {
    prepareImageForRecognition,
    cleanupTemporaryImage,
};
