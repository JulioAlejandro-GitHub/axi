/**
 * @fileoverview Unified service for face recognition.
 * This service combines the Human library for face detection and preprocessing,
 * and the CompreFace library for face recognition.
 */

const human = require('./human/detector');
const humanProcessor = require('./human/procesador');
const compreface = require('./compreface/reconocimiento');

/**
 * Registers a face for a subject.
 * @param {Buffer} imageBuffer The image containing the face.
 * @param {string} subject The subject's name.
 * @returns {Promise<object>} The result of the registration from CompreFace.
 * @throws {Error} If no face is detected or if the registration fails.
 */
async function registrarRostro(imageBuffer, subject) {
    const detectionResult = await human.detect(imageBuffer);
    if (detectionResult.face.length === 0) {
        throw new Error('No face detected in the image.');
    }

    // Using the first detected face
    const face = detectionResult.face[0];
    const processedImage = await humanProcessor.extractFace(imageBuffer, face);

    return compreface.registrarRostro(processedImage, subject);
}

/**
 * Recognizes all faces in an image.
 * This function sends the entire image buffer to the recognition service,
 * which is responsible for detecting and identifying all faces present.
 * @param {Buffer} imageBuffer The image containing one or more faces.
 * @returns {Promise<object>} The recognition result from CompreFace, containing all identified faces.
 * @throws {Error} If the recognition process fails.
 */
async function reconocerRostro(imageBuffer) {
    // Pass the original image buffer directly to the recognition service.
    // The service will detect and recognize all faces in the image.
    return compreface.verificarIdentidad(imageBuffer);
}

module.exports = {
    registrarRostro,
    reconocerRostro,
};
