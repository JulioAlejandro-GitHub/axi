const notificationService = require('../notification-service');
const { registerAcceso } = require('../../controllers/visit');
const logger = require('../../helpers/logger');

const recognitionCache = new Map();
const CACHE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

class PostProcessingService {
    async handleRecognitionResults(results, context) {
            logger.warn('handleRecognitionResults 1.');

        if (!results) {
            logger.warn('handleRecognitionResults received null or undefined results. Skipping.');
            return;
        }

        try {
            // --- Notification Logic ---
            this.sendNotifications(results, context);

            // --- Register Access ---
            if (results.personasIdentificadas.length > 0 || results.personasDesconocidas.length > 0) {
                await this.registerAccess(results, context);
            }
        } catch (error) {
            logger.error('Error during post-processing of recognition results:', error);
        }
    }

    sendNotifications(results, context) {
            logger.warn('sendNotifications 1.');

        const now = Date.now();
        const alertData = {
            camera: context.camera.nombre || 'Unknown Camera',
            location: context.camera.ubicacion || 'Unknown Location',
            timestamp: new Date().toISOString(),
            imagePath: results.imgOriginal,
            ip: context.ip || 'N/A'
        };

        results.personasIdentificadas?.forEach(person => {
            if (person.usuario_tipo != 'ladron') {
                // Check cache to avoid spamming notifications
                const lastSeen = recognitionCache.get(person.usuario_id);
                if (lastSeen && (now - lastSeen < CACHE_DURATION_MS)) {
                    logger.warn(`Skipping notification for already seen user ID [${person.usuario_id}][${person.usuario_tipo}].`);
                    return;
                }
                
                recognitionCache.set(person.usuario_id, now);
            }
            if (person.usuario_tipo === 'ladron') {
                notificationService.sendAlert('thief_detected', {
                    ...alertData,
                    name: person.usuario_nombre,
                    usuario_id: person.usuario_id,
                    face_id: person.face_id,
                    camera: context.camera
                });
            }
        });

        results.personasDesconocidas?.forEach((person, index) => {
            // We could add caching for unknown faces based on embeddings if needed,
            // but for now, we notify for each unknown detection.
            notificationService.sendAlert('unknown_user', {
                ...alertData,
                name: 'Desconocido',
                usuario_id: 0,
                face_id: index,
                camera: context.camera
            });
        });
    }

    async registerAccess(results, context) {
        try {
            await registerAcceso({
                ...results,
                camara_id: context.camera.camara_id
            });
        } catch (error) {
            logger.error('Error registering visit in background:', error);
        }
    }
}

module.exports = new PostProcessingService();
