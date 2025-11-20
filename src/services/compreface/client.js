
const { url, apiKey, port } = require('./config');
const minScore = process.env.minScore_similarity;
let recognitionService;

const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const facesDir = path.join(__dirname, '../../../temp');
const logger = require('../../helpers/logger');


async function getRecognitionService() {
    if (!recognitionService) {
        const { CompreFace } = await import('@exadel/compreface-js-sdk');
        let compreFace = new CompreFace(url, port); // set CompreFace url and port 
        recognitionService = compreFace.initFaceRecognitionService(apiKey); // initialize service
    }
    return recognitionService;
}

async function recognize(imageBuffer, context) {
    const service = await getRecognitionService();
    const { faceFileName, camera } = context;

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

    const imgValueName = `${uuidv4()}.jpg`
    const tempFilePath = path.join(facesDir, imgValueName);
    const imgValuePathRelative = `./temp/${imgValueName}`

    try {
        fs.writeFileSync(tempFilePath, imageBuffer);//img original.. todos los rostros

        logger.debug(`service.recognize ??? --> imgValuePathRelative[${imgValuePathRelative}]`)
        const response = await service.recognize(imgValuePathRelative, options);

        personasDetectadas = response.result.length;
        logger.debug(`service.recognize <-- personasDetectadas[${personasDetectadas}]`)

        let bestMatch_similarity = 0;

        for (const [index, face] of response.result.entries()) {
            logger.debug(`=== Rostro [${index + 1}] === CompreFAce`);

            let faceImgName = null;
            try {
                const { x_min, y_min, x_max, y_max } = face.box;
                const width = x_max - x_min;
                const height = y_max - y_min;

                faceImgName = uuidv4() + '.jpg';
                const faceImagePath = path.join(facesDir, faceImgName);

                try {
                    await sharp(imageBuffer)
                        .extract({ left: x_min, top: y_min, width, height })
                        .toFile(faceImagePath);
                } catch (error) {
                    logger.error(`Error extract imageBuffer: Rostro[${index + 1}] [${faceImagePath}]`);
                }
            } catch (error) {
                logger.error('Error al extraer o guardar el rostro:', error);
                faceImgName = null;
            }

            const hasSubjects = face.subjects && face.subjects.length > 0;
            const bestSubject = hasSubjects ? face.subjects[0] : { subject: 'desconocido', similarity: 0 };

            let usr_id      = `desconocido_0_${index}`;
            let usr_name    = `desconocido_0_${index}`;
            let usr_type    = ``;
            let similarity = 0;
            if (face.subjects[0]) {
                ({subject:usr_id, subject:usr_name, similarity } = face.subjects[0]);
            }

            // usuario_tipo    : '',  // importante !!!!!!!!!!!!!!!!!!!! sobre todo ladron !!!!!! esta en BD hay que buscarló

            const matchFace = {
                similarity      : similarity,
                usuario_id      : usr_id,
                embedding       : face.embedding,  //solo 1 embedding que es de la foto recortada
                box             : face.box,        //solo 1 box que es de la foto recortada
                img             : faceImgName,     //solo 1 Img que es de la foto recortada
                fuente          : ['compreface']
            };
            matchFaces.push(matchFace);
            
            if (hasSubjects && bestSubject.similarity >= minScore) {
                /**
                 * esta puede ser cualquier tipo de persona!!!!!
                 * usuario.tipo : enum('socio','empleado','familia','desconocido','ladron')
                 * En este punto, tenemos solo el ID_USR !!!! subject desde compreface
                 */
                logger.debug(`Identificadas -> [${bestSubject.subject}][${bestSubject.similarity}][${faceImgName}]`);
                const identifiedPerson = {
                    similarity: bestSubject.similarity,
                    usuario_tipo: '',  // importante !!!!!!!!!!!!!!!!!!!! sobre todo ladron !!!!!!
                    nombre: bestSubject.subject,
                    usuario_id: bestSubject.subject,
                    embedding: face.embedding,
                    box: face.box,
                    img: faceImgName,
                    fuente          : ['compreface']
                };
                personasIdentificadas.push(identifiedPerson);
            } else {
                /**
                 * en este caso puede que el rostro sea conocido, con un minScore mas bajo !!!!!
                 */
                logger.debug(`Desconocidas -> [${bestSubject.subject}][${bestSubject.similarity}][${faceImgName}]`);
                const unknownPerson = {
                    similarity: bestSubject.similarity,
                    usuario_tipo: 'desconocido',
                    nombre: 'nuevo Acceso',
                    usuario_id: `desconocido_0_${index}`,
                    embedding: face.embedding,
                    box: face.box,
                    img: faceImgName,
                    fuente          : ['compreface']
                };
                personasDesconocidas.push(unknownPerson);
            }
        }
        logger.debug(`function recognize return --> matchFaces[${matchFaces.length}] imgOriginal[${imgValueName}]`);
        
        return {
            personasDetectadas,
            personasIdentificadas,
            personasDesconocidas,
            matchFaces,
            imgOriginal:imgValueName
        };
    } catch (error) {
        logger.error(`Error recognize ?? ! camara_id[${camera.camara_id}] imgValueName[${imgValueName}] There is problem with recognize image: ${error}`);
        return {
            personasDetectadas: 0,
            personasIdentificadas: [],
            personasDesconocidas: [],
            matchFaces:[],
            imgOriginal:imgValueName
        };
    } finally {
        // if (fs.existsSync(tempFilePath)) {
        //     fs.unlinkSync(tempFilePath);
        // }
    }
}

async function addSubject(name) {
    const service = await getRecognitionService();
    const subjects = service.getSubjects();
    return subjects.add(name);
}

async function addFace(imageBuffer, subject) {
    const service = await getRecognitionService();
    const faceCollection = service.getFaceCollection();
    return faceCollection.add(imageBuffer, subject, { limit: 0 });
}

async function verifyFace(imageBuffer, image_id) {
    const service = await getRecognitionService();
    const faceCollection = service.getFaceCollection();
    return faceCollection.verify(imageBuffer, image_id, { limit: 0 });
}




module.exports = {
    recognize,
    addSubject,
    addFace,
    verifyFace,
};
