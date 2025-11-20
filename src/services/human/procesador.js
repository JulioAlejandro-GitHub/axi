/**
 * @fileoverview Image processing for face recognition.
 */

const { human } = require('./detector');

/**
 * Extracts a face from an image, resizes it, and normalizes it.
 * @param {Buffer} imageBuffer The original image buffer.
 * @param {object} face The face object from the Human library detection result.
 * @returns {Promise<Buffer>} The processed face image as a buffer.
 * @throws {Error} If the processing fails.
 */
async function extractFace(imageBuffer, face) {
    try {
        const tensor = human.tf.node.decodeImage(imageBuffer, 3);
        const [x, y, width, height] = face.box;
        const faceTensor = human.tf.slice(tensor, [y, x, 0], [height, width, 3]);

        // Resize to 224x224, which is a common size for face recognition models.
        const resizedTensor = human.tf.image.resizeBilinear(faceTensor, [224, 224]);

        // Do not normalize here, as CompreFace expects a standard image.
        // const normalizedTensor = human.tf.div(resizedTensor, 255.0);

        const encodedImage = await human.tf.node.encodeJpeg(resizedTensor);

        human.tf.dispose([tensor, faceTensor, resizedTensor]);

        return Buffer.from(encodedImage);
    } catch (error) {
        console.error('Error processing face:', error);
        throw error;
    }
}

module.exports = {
    extractFace,
};
