const { detect } = require('../../human/detector');
const logger = require('../../../helpers/logger');
const tf = require('@tensorflow/tfjs-node');

const { decryptData } = require('../../../helpers/crypto-helper');
const { BD_GetFacesForHumanMatcher } = require('../../../database/usuario');

const minScore = process.env.minScore_similarity;

class HumanEngine {
    constructor(config) {
        this.knownDescriptors = [];
        this.initializationPromise = null;
        this.isInitialized = false;
        this.config = config;
        this.matchThreshold = 0.7;
        this.uploadsPath = '';
        this.initializationPromise = this.initialize();
    }

    async initialize() {
        if (this.isInitialized) {
            return;
        }
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        try {
            logger.info('Initializing Human Engine...');
            await tf.setBackend('tensorflow');
            await tf.ready();

            this.matchThreshold = this.config.recognition.human.matchThreshold || 0.7;
            this.uploadsPath = this.config.uploads.path;
            if (!this.uploadsPath) {
                throw new Error('Uploads path is not configured.');
            }

            const { rows: faces } = await BD_GetFacesForHumanMatcher();
            if (faces && faces.length > 0) {
                const faceProcessingPromises = faces.map(async (face) => {
                    try {
                        if (face.embedding) {
                            this.knownDescriptors.push({
                                usuario_id: face.usuario_id,
                                nombre: face.nombre,
                                usuario_tipo: face.usuario_tipo,
                                descriptor: decryptData(face.embedding),
                                embedding: decryptData(face.embedding)
                            });
                        }
                    } catch (error) {
                        logger.error(`Error processing face ${face.img} for Human Engine:`, error);
                    }
                });
                await Promise.all(faceProcessingPromises);
            }

            this.isInitialized = true;
            logger.info(`Human Engine initialized with ${this.knownDescriptors.length} face descriptors.`);
        } catch (error) {
            logger.error('Fatal error during Human Engine initialization:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    async recognize(imageBuffer, context) {
        await this.initializationPromise;
        if (!this.isInitialized) {
            logger.error("Human Engine is not initialized.");
            return this.defaultEmptyResult(context.img.name);
        }

        const { img } = context;
        let personasIdentificadas = [];
        let personasDesconocidas = [];
        let matchFaces = [];

        try {
            const result = await detect(imageBuffer);
            const personasDetectadas = result.face.length;

            const AllKnownEmbeddings = this.knownDescriptors.map((rec) => rec.embedding);


            logger.error(`Human result.face.length: [${result.face.length}] ???????`);


            for (let i = 0; i < result.face.length; i++) {
                const face = result.face[i];
                if (!face.embedding) continue;

                const cosineMatch = this.cosineMatchFind(face.embedding, AllKnownEmbeddings);
                const matchKnownData = this.knownDescriptors[cosineMatch.index];

                const usr_id = matchKnownData ? matchKnownData.usuario_id : `desconocido_0_${i}`;
                const usr_type = matchKnownData ? matchKnownData.usuario_tipo : '';

                const matchFace = {
                    similarity: cosineMatch.similarity,
                    usuario_id: usr_id,
                    embedding: face.embedding,
                    box: face.box,
                    mesh: face.mesh,
                    rotation: face.rotation,
                };
                matchFaces.push(matchFace);

                if (cosineMatch.similarity > minScore) {
                    personasIdentificadas.push({ ...matchFace, usuario_tipo: usr_type });
                } else {
                    personasDesconocidas.push({ ...matchFace, usuario_tipo: 'desconocido' });
                }
            }

            return {
                engine: 'human',
                personasDetectadas,
                personasIdentificadas,
                personasDesconocidas,
                matchFaces,
                imgOriginal: img.name
            };
        } catch (error) {
            logger.error('Error during recognition in Human Engine:', error);
            return this.defaultEmptyResult(img.name, error);
        }
    }

    cosineMatchFind(queryEmbedding, databaseEmbeddings) {
        if (!queryEmbedding || !databaseEmbeddings || databaseEmbeddings.length === 0) {
            return { index: -1, distance: 1, similarity: 0 };
        }

        let bestMatch = { index: -1, similarity: -1, distance: 2 };

        for (let i = 0; i < databaseEmbeddings.length; i++) {
            const dbEmbedding = databaseEmbeddings[i];
            if (!dbEmbedding) continue;

            let dotProduct = 0;
            let magA = 0;
            let magB = 0;
            for (let j = 0; j < queryEmbedding.length; j++) {
                dotProduct += queryEmbedding[j] * dbEmbedding[j];
                magA += queryEmbedding[j] ** 2;
                magB += dbEmbedding[j] ** 2;
            }
            const magProduct = Math.sqrt(magA) * Math.sqrt(magB);
            if (magProduct === 0) continue;

            const similarity = dotProduct / magProduct;
            if (similarity > bestMatch.similarity) {
                bestMatch.similarity = similarity;
                bestMatch.index = i;
                bestMatch.distance = 1 - similarity;
            }
        }
        return bestMatch;
    }

    defaultEmptyResult(imgOriginalName, error = null) {
        return {
            engine: 'human',
            personasDetectadas: 0,
            personasIdentificadas: [],
            personasDesconocidas: [],
            matchFaces: [],
            imgOriginal: imgOriginalName,
            error: error ? error.message : undefined
        };
    }
}

module.exports = HumanEngine;
