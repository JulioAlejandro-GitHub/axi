const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../helpers/logger');
const { url, apiKey, port } = require('../../compreface/config');
const { BDupdAccesoImgCompreFace } = require("../../../database/usuario");
const { copyAFile } = require('../../../helpers/subir-archivo');

const facesDir = path.join(__dirname, '../../../../temp');
const minScore = process.env.minScore_similarity;

let compreFaceService;
let subjects;
let faceCollection;

async function initializeCompreFace() {
    if (!compreFaceService) {
        try {
            const { CompreFace } = await import('@exadel/compreface-js-sdk');
            const compreFace = new CompreFace(url, port);
            compreFaceService = compreFace.initFaceRecognitionService(apiKey);
            subjects = compreFaceService.getSubjects();
            faceCollection = compreFaceService.getFaceCollection();
            logger.info('CompreFace Service Initialized');
        } catch (error) {
            logger.error('Failed to initialize CompreFace Service', error);
            throw error;
        }
    }
}

async function recognize(imageBuffer, context) {
    await initializeCompreFace();

    const { camera, img } = context;

    let personasIdentificadas = [];
    let personasDesconocidas = [];
    let personasDetectadas = 0;
    let matchFaces = [];

    let options = {
        limit: 0,
        det_prob_threshold: 0.8,
        prediction_count: 1,
        face_plugins: "calculator,age,gender,landmarks",
        status: "true"
    };

    try {
        const response = await compreFaceService.recognize(img.PathRelative, options);

        personasDetectadas = response.result.length;

        for (const [index, face] of response.result.entries()) {
            let faceImgName = null;
            try {
                const { x_min, y_min, x_max, y_max } = face.box;
                const width = x_max - x_min;
                const height = y_max - y_min;

                faceImgName = 'CompreFace_' + uuidv4() + '.jpg';
                const faceImagePath = path.join(facesDir, faceImgName);
                await sharp(imageBuffer)
                    .extract({ left: x_min, top: y_min, width, height })
                    .toFile(faceImagePath);
            } catch (error) {
                logger.error(`Error al extraer rostro[${index + 1}]:[${error}]`);
            }

            const hasSubjects = face.subjects && face.subjects.length > 0;
            const bestSubject = hasSubjects ? face.subjects[0] : { subject: 'desconocido', similarity: 0 };

            const matchFace = {
                similarity: bestSubject.similarity,
                usuario_id: bestSubject.subject,
                box: face.box,
                img: faceImgName
            };
            matchFaces.push(matchFace);

            if (hasSubjects && bestSubject.similarity >= minScore) {
                const identifiedPerson = {
                    similarity: bestSubject.similarity,
                    usuario_tipo: '',
                    usuario_id: bestSubject.subject,
                    box: face.box,
                    img: faceImgName
                };
                personasIdentificadas.push(identifiedPerson);
            } else {
                const unknownPerson = {
                    similarity: bestSubject.similarity,
                    usuario_tipo: 'desconocido',
                    box: face.box,
                    img: faceImgName
                };
                personasDesconocidas.push(unknownPerson);
            }
        }

        return {
            engine: 'compreface',
            personasDetectadas,
            personasIdentificadas,
            personasDesconocidas,
            matchFaces,
            imgOriginal: img.name
        };
    } catch (error) {
        logger.error(`Error en recognizeCompreFace para la cámara [${camera.camara_id}] y la imagen [${img.name}]: ${error}`);
        return {
            engine: 'compreface',
            personasDetectadas: 0,
            personasIdentificadas: [],
            personasDesconocidas: [],
            matchFaces:[],
            imgOriginal: img.name,
            error: error.message
        };
    }
}

async function mvImg(imgName) {
    const sourcePath      = path.join(process.cwd(), 'temp', imgName);
    const destinationPath = path.join(process.cwd(), 'frontend', 'public', 'uploads', 'faces', imgName);
    await copyAFile(sourcePath, destinationPath);
}

const addSubjects = async (subjectId) => {
    await initializeCompreFace();
    try {
        await subjects.add(subjectId);
    } catch (error) {
        logger.error(`Error en subjects.add: [${subjectId}][${error}]`);
    }
};

const addFaceCollection = async (data) => {
    await initializeCompreFace();
    const { subjectId, imgName, acceso_id } = data;

    if (!imgName) {
        logger.error(`addFaceCollection: error imgName[${imgName}]`);
        return false;
    }

    const imagePath = `./temp/${imgName}`;

    try {
        const response = await faceCollection.add(imagePath, subjectId);
        if (response.image_id) {
            BDupdAccesoImgCompreFace({ acceso_id, img: response.image_id });
        }
        await mvImg(imgName);
    } catch (error) {
        logger.error(`Error en addFaceCollection: [${subjectId}][${imagePath}][${error}]`);
        await mvImg(imgName).catch(moveError => {
            logger.error(`No se pudo mover la imagen después del fallo de addFaceCollection: ${imgName}`, moveError);
        });
    }
};

const delFaceCollection = async (data) => {
    await initializeCompreFace();
    const { image_id } = data;
    try {
        await faceCollection.delete(image_id);
    } catch (error) {
        logger.error(`Error en delFaceCollection: ${error}`);
    }
};

module.exports = {
    recognize,
    addSubjects,
    addFaceCollection,
    delFaceCollection
};
