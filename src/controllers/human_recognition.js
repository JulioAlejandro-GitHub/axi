
const { response } = require('express');
const fs = require('fs');
const imageSize = require('image-size');
const process = require('process');
const sharp = require('sharp');
const tf = require('@tensorflow/tfjs-node'); // can also use '@tensorflow/tfjs-node-gpu' if you have environment with CUDA extensions
const Human = require('@vladmandic/human').default; // points to @vladmandic/human/dist/human.node.js

const faceCache = require('../helpers/face-cache');
const { isPoseFrontal } = require('../helpers/facial_analysis');
const notificationService = require('../services/notification-service');
const { registerAcceso } = require('./visit');

const logger = require('../helpers/logger');

const userConfig = {
    backend: 'tensorflow',
    async: true,
    warmup: 'none',
    cacheSensitivity: 0,
    debug: false, // Turn off debug mode for production
    modelBasePath: process.env.URL_human_models,
    deallocate: true,
    filter: {
        enabled: true,
        equalization: true,
        width: 0,
    },
    face: {
        enabled: true,
        detector: {
            rotation: true,
            maxDetected: 5,
            minConfidence: process.env.human_similarity_minScore
        },
        // Mesh is required for rotation correction, but adds overhead.
        // Disable if rotation correction is not critical and performance is a priority.
        mesh: { enabled: true },
        description: { enabled: true },
        antispoof: { enabled: true },
        // Emotion and iris detection are disabled as they are not used in the recognition logic.
        emotion: { enabled: false },
        iris: { enabled: false },
    },
    // Body, hand, and gesture detection are disabled to save resources.
    hand: { enabled: false },
    gesture: { enabled: false },
    body: { enabled: false },
    segmentation: { enabled: false },
};

/**
 * Finds the best match for a given embedding from a list of embeddings using Cosine Similarity.
 * @param {number[]} queryEmbedding - The embedding to find a match for.
 * @param {number[][]} databaseEmbeddings - An array of embeddings to search through.
 * @returns {{ index: number, distance: number, similarity: number }} - The best match found.
 */
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

(async () => {
    await tf.setBackend('tensorflow');
    await tf.ready(); // Esperar a que TensorFlow.js termine la inicialización
    logger.debug('Versión de TensorFlow.js:', tf.version.tfjs);
    logger.debug('Backend actual:', tf.getBackend());
    logger.debug('Backends disponibles:', Object.keys(tf.engine().registry));
})();

const human = new Human(userConfig); // new instance of human
// logger.debug('Modelos de detección disponibles:', Human.models.face.detector);


/**
 * The similarity score threshold for a match. This value is critical for accuracy.
 * Since the matching logic now uses Cosine Similarity, this threshold may need to be adjusted.
 * A typical threshold for cosine similarity is higher than for Euclidean distance, often in the 0.9+ range for high-confidence matches.
 * It is recommended to test and fine-tune this value based on the performance with the new configuration.
 */
const minScore = process.env.human_similarity_minScore; // ajsutar parametro
const allExtractedFaces = []; // array that will hold all detected faces

async function detectAndMatch(imageBuffer, dbAllKnownFaces) {
    const t0 = human.now();
    const tensor = human.tf.node.decodeImage(imageBuffer);
    const result = await human.detect(tensor, userConfig);
    const t1 = human.now();
    human.tf.dispose(tensor);

    // logger.debug(`Detection time: ${Math.round(t1 - t0)}ms`);

    const emptyMatch = {
        similarity: 0,
        name: 'desconocido',
        face_id: 0,
        usuario_id: 0,
        tipo: 'desconocido',
        embedding: null,
        box: [],
        mesh: []
    };

    if (!result || !result.face || result.face.length === 0) {
        return {
            detectedFaces: 0,
            bestMatch: { ...emptyMatch },
            allFaces: []
        };
    }

    // Filter faces to only include those with a frontal pose
    const frontalFaces = result.face.filter(face => isPoseFrontal(face));
    // logger.debug(`Detected ${result.face.length} faces, ${frontalFaces.length} are frontal.    ******rotation[${result.face.rotation}]`);
    // logger.debug(`frontalFaces [${frontalFaces}]`);

    // if (frontalFaces.length === 0) {
    //     // No frontal faces detected, return empty match but indicate total faces detected
    //     // para implementa reemplazar [result.face]    por [frontalFaces]
    //     return {
    //         detectedFaces: result.face.length,
    //         bestMatch: { ...emptyMatch },
    //         allFaces: []
    //     };
    // }

    const AllKnownEmbeddings = dbAllKnownFaces.map((rec) => rec.embedding);
    let bestMatch = { ...emptyMatch };
    const allFaces = result.face.map(face => ({
        embedding: face.embedding,
        mesh: face.mesh,
        box: face.box,
        similarity: 0,
        rotation: face.rotation,
    }));

    for (let i = 0; i < result.face.length; i++) {
        const face = result.face[i];
        if (!face.embedding) continue;
        const cosineMatch = cosineMatchFind(face.embedding, AllKnownEmbeddings);
        allFaces[i].similarity = cosineMatch.similarity;

        // const libraryMatch = await human.match.find(face.embedding, AllKnownEmbeddings);
        // logger.debug('libraryMatch:::::::::', libraryMatch)

        if (cosineMatch.similarity > bestMatch.similarity) {
            bestMatch = {
                similarity  : cosineMatch.similarity,
                name        : dbAllKnownFaces[cosineMatch.index].nombre,
                face_id     : dbAllKnownFaces[cosineMatch.index].face_id,
                usuario_id  : dbAllKnownFaces[cosineMatch.index].usuario_id,
                tipo        : dbAllKnownFaces[cosineMatch.index].usuario_tipo,
                embedding   : face.embedding,
                mesh        : face.mesh,
                box         : face.box,
                rotation    : face.rotation,
            };
        }
    }

    // If no face was matched but embeddings were detected, provide the one with the highest (yet insufficient) similarity.
    if (bestMatch.similarity === 0 && result.face.length > 0 && result.face[0].embedding) {
        bestMatch.embedding = result.face[0].embedding;
        bestMatch.mesh      = result.face[0].mesh;
        bestMatch.rotation  = result.face[0].rotation;
    }

    return {
        detectedFaces: result.face.length,
        bestMatch,
    };
}

async function processImageForRecognition(imageBuffer, context = {}) {
    const { camera, imagePath } = context;
    // Pre-load human models if not already loaded
    if (!human.models.face) {
        await human.load();
    }

    // Load face descriptor database from cache
    const dbAllKnownFaces = faceCache.getKnownFaces();
    if (dbAllKnownFaces.length === 0) {
        logger.debug('No known faces in the database to compare against. BD empty ?????');
    }

    // Preprocess the image for better recognition accuracy
    const processedBuffer = await sharp(imageBuffer)
        .normalize()
        .sharpen()
        .toBuffer();

    const { detectedFaces, bestMatch } = await detectAndMatch(processedBuffer, dbAllKnownFaces);

    let personasIdentificadas = [];
    let personasDesconocidas = [];


    if (bestMatch.usuario_id) {
        logger.debug(`Best Match: usuario_id[${bestMatch.usuario_id}] usuario_tipo[${bestMatch.tipo}] acceso_id[${bestMatch.face_id}] similarity[${bestMatch.similarity.toFixed(4)}] vs minScore[${minScore}]`);
    }else{
        logger.debug(`Final Match Results --- detectedFaces[${detectedFaces}] imagePath[${imagePath}]`);
    }
    // logger.debug('--------------------------');

    if (bestMatch.similarity >= minScore) {
        const identifiedPerson = {
            nombre      : bestMatch.name,
            face_id     : bestMatch.face_id,
            usuario_id  : bestMatch.usuario_id,
            usuario_tipo: bestMatch.tipo,
            similarity  : bestMatch.similarity,
            embedding   : bestMatch.embedding,
            mesh        : bestMatch.mesh
        };
        personasIdentificadas.push(identifiedPerson);
    } else if (detectedFaces > 0) {
        const unknownPerson = {
            embedding   : bestMatch.embedding,
            mesh        : bestMatch.mesh,
            usuario_tipo: 'nuevo',
            similarity  : bestMatch.similarity,
            nombre      : 'nuevo Acceso',
            face_id     : 0,
            usuario_id  : 0
        };
        personasDesconocidas.push(unknownPerson);
    }
    
    /**
     * cuando llegan del servicio onvif
     * no sube la imagen ... llega solo el buffer y es por tiempo... tipo video streaming
     * diferente a webcam que si esta detectando humanos antes de enviar y subir la foto....
     * en el caso envif, no es necesario enviar alerta....
     */
    //(detectedFaces == 0 && camera.protocolo == 'webcam')||
    if (
        //public/js/script_webcam.js
        // async function FaceDetecHuman(fuenteVideoImg, canvas, ubicacionCamara, idFuente, permanete = false) {
        //      async function SendToRecognition(.  arg === null || arg === undefined
        (detectedFaces === 0 && camera.protocolo === 'webcam')|| // que pasa aqui ???? realmente se detecto un rostro, pero no es lo suficiente identificable !!!! se tomo la foto y se envio a recognition!!!
        (
            detectedFaces >= 1 &&
            ['ladron','desconocido'].includes(bestMatch.tipo)
        )
    ) {
        notificationService.sendAlert(bestMatch.tipo === 'ladron' ? 'thief_detected' : 'unknown_user', {
            name        : bestMatch.name,
            face_id     : bestMatch.face_id,
            usuario_id  : bestMatch.usuario_id,
            timestamp   : new Date().toISOString(),
            ...context
        });
    }

    return {
        personasDetectadas: detectedFaces,
        personasIdentificadas,
        personasDesconocidas,
        matchDetails: {
            bestMatch
        }
    };
}

const humanFaceMatchImg = async (req, res = response) => {
    logger.debug(`humanFaceMatchImg desde donde llega???? --------------------------------------------------------- humanFaceMatchImg`);

    // The service will pass a flag `isStream` and the direct image path
    const { imgFileName, isStream, imagePath: streamImagePath,  ip } = req;
    const { ubicacionCamara, idFuente, camera } = req.body; // ?????? con idFuente = camara_id se obtiene la ip

    if (!imgFileName) {
        logger.debug('humanFaceMatchImg: No image file name provided.');
        // In a real controller context, you'd send a response.
        // Since this might be called from the service, we just return an error-like object.
        return { error: 'No image file name provided' };
    }

    if (camera.camara_id) {
        /**
         * caso backend onvif -> no se sabe aun si hay rostro
         * caso webcam -> se detecto ya un rostro
         */
    }

    try {
        let imageBuffer;
        // If it's from the stream, use the direct path. Otherwise, construct the path.
        const imagePath = isStream ? streamImagePath : `./uploads/imgs/${imgFileName}`;

        if (!fs.existsSync(imagePath)) {
            logger.debug(`Image file not found at: ${imagePath}`);
            return { error: 'Image file not found' };
        }

        imageBuffer = await fs.promises.readFile(imagePath);

        const recognitionResults = await processImageForRecognition(imageBuffer, {
            camera,
            imagePath
        });

        logger.debug(`Detectadas --------------- [${JSON.stringify(recognitionResults.personasDetectadas)}]`);
        logger.debug(`Identificadas ------------ [${JSON.stringify(recognitionResults.personasIdentificadas.length)}]`);
        logger.debug(`Desconocidas ------------- [${JSON.stringify(recognitionResults.personasDesconocidas.length)}]`);

        // Register the visit asynchronously
        logger.debug(`......registerAcceso. humanFaceMatchImg `)
        registerAcceso({
            ...recognitionResults,
            imgFileName: imgFileName,
            perfil: req.body.perfil || 'undetected',
            ubicacionCamara: ubicacionCamara,
            camara_id: idFuente
        }).catch(err => console.error('Error registering visit in background:', err));

        // If called from a controller (res object exists), send JSON response.
        // Otherwise, return the results for the service to handle.
        if (res && typeof res.status === 'function') {
            return res.status(200).json(recognitionResults);
        } else {
            return recognitionResults;
        }

    } catch (error) {
        console.error(`Error in humanFaceMatchImg: ${error}`);
        if (res && typeof res.status === 'function') {
            return res.status(500).json({ msg: 'Internal server error during face recognition' });
        } else {
            return { error: 'Internal server error during face recognition' };
        }
    }
}

module.exports = {
    humanFaceMatchImg,
    processImageForRecognition
}