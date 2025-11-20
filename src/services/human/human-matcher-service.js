// const fs = require('fs/promises');
// const path = require('path');
const { detect } = require('./detector');
const { BD_GetFacesForHumanMatcher } = require('../../database/usuario');
const logger = require('../../helpers/logger');
const tf = require('@tensorflow/tfjs-node'); // can also use '@tensorflow/tfjs-node-gpu' if you have environment with CUDA extensions

const { decryptData } = require('../../helpers/crypto-helper');

const minScore = process.env.minScore_similarity;

class HumanMatcherService {
    constructor(config) {
        this.knownDescriptors = [];
        this.initializationPromise = null;
        this.isInitialized = false;

        // Configuration is now injected, resolving the module load order issue.
        this.config = config;
        this.matchThreshold = 0.7; // Default, will be overwritten
        this.uploadsPath = ''; // Default, will be overwritten

        // Start initialization, but don't block the constructor
        this.initializationPromise = this.initialize();
    }

    async initialize() {
        if (this.isInitialized) {
            logger.info('Human Matcher Service is already initialized.');
            return;
        }
        // Guard against multiple initializations
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        try {
            logger.info('Initializing Human Matcher Service...');

            // 1. Initialize TensorFlow
            await tf.setBackend('tensorflow');
            await tf.ready();
            logger.info(`TensorFlow.js backend set to: ${tf.getBackend()}`);

            // 2. Set configuration from the injected config object
            this.matchThreshold = this.config.recognition.human.matchThreshold || 0.7;
            this.uploadsPath = this.config.uploads.path;
            if (!this.uploadsPath) {
                throw new Error('Uploads path is not configured. Human Matcher cannot initialize.');
            }

            // 3. Load known faces from the database
            logger.info('Loading known faces from database for Human Matcher...');
            const { rows: faces } = await BD_GetFacesForHumanMatcher();
            if (!faces || faces.length === 0) {
                logger.warn('No faces found in the database to initialize Human Matcher.');
            } else {
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
                        } else {
                            // logger.warn(`Face with acceso_id[${face.acceso_id}] usuario_id[${face.usuario_id}] is missing a human_embedding, skipping.`);
                        }
                    } catch (error) {
                        logger.error(`Error processing face ${face.img} for Human Matcher:`, error);
                    }
                });
                await Promise.all(faceProcessingPromises);
            }

            this.isInitialized = true;
            logger.info(`Human Matcher Service initialized successfully with ${this.knownDescriptors.length} face descriptors.`);

        } catch (error) {
            logger.error('Fatal error during Human Matcher Service initialization:', error);
            // Make sure subsequent calls to match don't hang
            this.isInitialized = false;
            // Propagate the error so the service consumer knows initialization failed
            throw error;
        }
    }

    async match(imageBuffer, context) {
        // Ensure initialization is complete before proceeding.
        await this.initializationPromise;

        if (!this.isInitialized) {
            logger.error("Human Matcher Service is not initialized. Cannot perform match.");
            // Return a default empty result to avoid crashing the worker
            return {
                personasDetectadas: 0,
                personasIdentificadas: [],
                personasDesconocidas: [],
                matchFaces: [],
                imgOriginal: 'imageBuffer'
            };
        }

        const { camera, img } = context;

        let personasIdentificadas = [];
        let personasDesconocidas = [];
        let personasDetectadas = 0;
        let matchFaces = [];

        try {
            /**
             * Human_Embedding deben estar en BD.......
             * hay muchos rostros en imageBuffer 
             */
            const result = await detect(imageBuffer);
            // logger.warn(`* result [${JSON.stringify(result)}] !!!!!!`);
            personasDetectadas = result.face.length;
            logger.debug(`HUMAN detect <-- personasDetectadas[${personasDetectadas}]`)



            /**
             * si no existen knownDescriptors
             * hay que obtener el de la imagen actual... y no comparar !!!
             * lo mas probable es que si tenga
             */
            // if (this.knownDescriptors.length === 0) {
            //     logger.warn('Human Matcher this.knownDescriptors.length === 0........');
            //     return { subject: null, similarity: 0 };
            // }




            const AllKnownEmbeddings = this.knownDescriptors.map((rec) => rec.embedding);

                // logger.debug(`=== AllKnownEmbeddings [${JSON.stringify(AllKnownEmbeddings)}]`);


            // const allFaces = result.face.map(face => ({
            //     embedding: face.embedding,
            //     mesh: face.mesh,
            //     box: face.box,
            //     similarity: 0,
            //     rotation: face.rotation,
            // }));

            for (let i = 0; i < result.face.length; i++) {// cada rostro de la imageBuffer
                logger.debug(`=== Rostro ${i + 1} === HUMAN`);
                const face = result.face[i];
                if (!face.embedding) continue;

                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding [${JSON.stringify(face.embedding)}]`);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);
                // logger.debug(`face.embedding `);

                const cosineMatch = cosineMatchFind(face.embedding, AllKnownEmbeddings);
                // allFaces[i].similarity = cosineMatch.similarity;


                logger.debug(`=== cosineMatch [${JSON.stringify(cosineMatch)}]`);



                // const libraryMatch = await human.match.find(face.embedding, AllKnownEmbeddings);
                // logger.debug('libraryMatch:::::::::', libraryMatch)

                const matchKnownData = this.knownDescriptors[cosineMatch.index];
                let usr_id      = `desconocido_0_${i}`;
                let usr_name    = `desconocido_0_${i}`;
                let usr_type    = ``;
                if (matchKnownData) {
                    // logger.warn(`* matchKnownData [${matchKnownData.length}] !!!!!! ?????????????????????????????????????`);
                    ({usuario_id:usr_id, nombre:usr_name, usuario_tipo:usr_type } = matchKnownData);
                    // logger.warn(`* matchKnownData [${matchKnownData.length}] !!!!!! ?????????????????????????????????????`);

                }

                logger.debug(`=== Rostro ${i + 1} === HUMAN --> usr_id[${usr_id}] usr_type[${usr_type}]`);

                /**
                 * Human si necsita embedding para hacer el reconocimiento...
                 */
                const matchFace = {
                    similarity      : cosineMatch.similarity,
                    usuario_id      : usr_id,
                    embedding       : face.embedding,  //solo 1 embedding que es de la foto recortada
                    box             : face.box,        //solo 1 box que es de la foto recortada
                    mesh            : face.mesh,       //solo 1
                    rotation        : face.rotation,   //solo 1
                    // img             : 'imageBuffer'    //solo 1 Img que es de la foto recortada
                };
                matchFaces.push(matchFace);

                if (cosineMatch.similarity > minScore) {
                    logger.debug(`Identificadas -> usuario_id[${usr_id}][${cosineMatch.similarity}][image Buffer]`);
                    const identifiedPerson = {
                        similarity      : cosineMatch.similarity,
                        usuario_tipo    : usr_type,
                        // nombre          : usr_name,
                        usuario_id      : usr_id,
                        embedding       : face.embedding,
                        mesh            : face.mesh,
                        box             : face.box,
                        rotation        : face.rotation,
                        // img             : 'imageBuffer'
                    };
                    personasIdentificadas.push(identifiedPerson);
                } else {
                    /**
                     * en este caso puede que el rostro sea conocido, con un minScore mas bajo !!!!!
                     */
                    logger.debug(`Desconocidas -> [${cosineMatch.similarity}][${face.rotation}][image Buffer]`);
                    const unknownPerson = {
                        similarity      : cosineMatch.similarity,
                        usuario_tipo    : 'desconocido',
                        // nombre          : 'nuevo Acceso',
                        usuario_id      : usr_id,
                        embedding       : face.embedding,
                        mesh            : face.mesh,
                        box             : face.box,
                        rotation        : face.rotation,
                        // img             : 'imageBuffer'
                    };
                    personasDesconocidas.push(unknownPerson);
                }
            }

    // logger.debug(`HUMAN recognize return --> Detectadas[${personasDetectadas}] Identificadas[${personasIdentificadas.length}] Desconocidas[${personasDesconocidas.length}] imageBuffer...`);
    logger.debug(`HUMAN recognize return --> matchFaces[${matchFaces.length}] image Buffer...`);
    // logger.warn(`* matchFaces.length [${matchFaces.length}] !!!!!!`);
    // matchFaces.forEach(f => {
    //     logger.warn(`* HUMAN --> matchFaces  usuario_id [${f.usuario_id}] !!!!!!`);
    //     logger.warn(`* HUMAN --> matchFaces  similarity [${f.similarity}] !!!!!!`);
    // });
            return {
                personasDetectadas,
                personasIdentificadas,
                personasDesconocidas,
                matchFaces,
                imgOriginal:img.name
            };
        } catch (error) {
            logger.error('Error durante la comparación en Human Matcher:', error);
            return {
                personasDetectadas: 0,
                personasIdentificadas: [],
                personasDesconocidas: [],
                matchFaces: [],
                imgOriginal:img.name
            };
        }
    }
}

function cosineMatchFind(queryEmbedding, databaseEmbeddings) {
    if (!queryEmbedding || !databaseEmbeddings || databaseEmbeddings.length === 0) {
        return { index: -1, distance: 1, similarity: 0 };
    }

    let bestMatch = {
        index: -1,
        similarity: -1, // Cosine similarity ranges from -1 to 1, so -1 is a safe initial value.
        distance: 2 // Cosine distance ranges from 0 to 2.
    };

    for (let i = 0; i < databaseEmbeddings.length; i++) {
        const dbEmbedding = databaseEmbeddings[i];
        if (!dbEmbedding) {
            continue
        };

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

        // logger.error('similarity:::::', similarity);


        if (similarity > bestMatch.similarity) {
            bestMatch.similarity = similarity;
            bestMatch.index = i;
            bestMatch.distance = 1 - similarity;
        }
    }

    return bestMatch;
}

// Export the class itself, not an instance, to allow for dependency injection.
module.exports = HumanMatcherService;