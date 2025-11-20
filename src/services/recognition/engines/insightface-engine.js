const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const config = require('../../../../config/config');
const logger = require('../../../helpers/logger');

class InsightFaceEngine {
    constructor() {
        this.name = 'insightface';
        this.url = config.recognition.insightface.url || 'http://localhost:8010/recognize';
    }

    async recognize(imageBuffer, context) {
        try {
            logger.info('InsightFaceEngine: Iniciando reconocimiento.');

            const { img } = context;
            const { tempFilePath } = img;

            logger.error(`tempFilePath = [${tempFilePath}]`);

            // VALIDACIÓN
            if (!fs.existsSync(tempFilePath)) {
                throw new Error(`El archivo no existe: ${tempFilePath}`);
            }

            // Leer buffer REAL desde el archivo que genera tu pipeline
            const fileBuffer = fs.readFileSync(tempFilePath);

            if (!fileBuffer || fileBuffer.length === 0) {
                throw new Error("El archivo está vacío o no se pudo leer.");
            }

            // // Construcción del FormData
            const formData = new FormData();
            // formData.append('image', fileBuffer, {
            //     filename: 'image.jpg',
            //     contentType: 'image/jpeg',
            // });

// const fs = require('fs');
formData.append('image', fs.createReadStream(tempFilePath));


            logger.error(`axios.post = [${this.url}]`);

            const response = await axios.post(this.url, formData, {
                headers: formData.getHeaders(),
                timeout: 30000,
            });

            logger.info('InsightFaceEngine: Respuesta recibida del servicio.');
            // logger.info(`response[${JSON.stringify(response)}]`);

    // The entire response object
    logger.info('Full response object:', response);

    // The useful data from the response (the response body)
    logger.info('Response data:', response.data);

    // You can access other properties too, e.g.:
    logger.info('Status code:', response.status); // e.g., 200
    logger.info('Status text:', response.statusText); // e.g., 'OK'
    logger.info('Response headers:', response.headers);

            return this.transformResponse(response.data);

        } catch (error) {
            logger.error('InsightFaceEngine: Error durante el reconocimiento: ' + error.message);
            logger.error(error);

            if (error.response) {
                logger.error('Data: ' + JSON.stringify(error.response.data));
                logger.error('Status: ' + error.response.status);
            }

            return { error: 'Fallo la comunicación con el servicio de InsightFace.' };
        }
    }

    transformResponse(responseData) {
        if (!responseData || !responseData.result) {
            return {
                personasIdentificadas: [],
                personasDesconocidas: [],
            };
        }

        const personasDesconocidas = responseData.result.map(face => ({
            box: {
                x_min: face.box[0],
                y_min: face.box[1],
                x_max: face.box[2],
                y_max: face.box[3],
            },
            confidence: face.confidence,
            embedding: face.embedding,
            nombre: 'desconocido',
        }));

        return {
            personasIdentificadas: [],
            personasDesconocidas,
        };
    }
}

module.exports = new InsightFaceEngine();
