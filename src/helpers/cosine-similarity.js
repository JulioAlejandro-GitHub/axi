/**
 * Calculates the cosine similarity between two vectors.
 * @param {Array<number>} vecA The first vector.
 * @param {Array<number>} vecB The second vector.
 * @returns {number} The cosine similarity between the two vectors.
 */
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
        return 0;
    }

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magA += vecA[i] ** 2;
        magB += vecB[i] ** 2;
    }

    const magProduct = Math.sqrt(magA) * Math.sqrt(magB);

    if (magProduct === 0) {
        return 0;
    }

    return dotProduct / magProduct;
}

module.exports = {
    cosineSimilarity,
};
