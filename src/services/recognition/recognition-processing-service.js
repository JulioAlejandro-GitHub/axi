const notificationService = require('../services/notification-service');
const { registerAcceso } = require('../controllers/visit');
const { BDgetUsuario } = require('../database/usuario');
const { crossValidate } = require('../helpers/cross-validator');
const logger = require('../helpers/logger');
const path = require('path');

const recognitionCache = new Map();
const CACHE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

async function handleRecognitionResults(combinedResults, context) {
    const { camera, imageName, jobId } = context;
    const now = Date.now();
    const text_jobId = jobId ? `jobId[${jobId}]` : '';

    logger.debug(`Handling results :: camara_id[${camera.camara_id}] imageName[${imageName}] :: ${text_jobId}`);

    // Construct the full path for the image
    const fullImagePath = path.join(process.cwd(), 'public', 'uploads', imageName);


    // 1. Cross-validate results from both engines. This now handles image cropping internally.
    const crossResults = await crossValidate(combinedResults.compreface, combinedResults.human, fullImagePath);

    // 2. Consolidate all uniquely identified people
    const allRecognized = [
        ...crossResults.reconocidosAmbos,
        ...crossResults.reconocidosSoloCompreFace,
        ...crossResults.reconocidosSoloHuman
    ];
    const recognizedIds = [...new Set(allRecognized.map(p => p.usuario_id))];

    if (crossResults.conflictoIdentidad.length > 0) {
        logger.warn(`${text_jobId} :: Conflictos de identidad detectados: ${JSON.stringify(crossResults.conflictoIdentidad)}`);
    }

    // 3. Fetch user data from database for all identified people
    let dbUsersMap = new Map();
    if (recognizedIds.length > 0) {
        const { rows: dbUsers } = await BDgetUsuario({ ids: recognizedIds });
        if (dbUsers) {
            dbUsers.forEach(user => dbUsersMap.set(user.usuario_id, user));
        }
    }

    // 4. Process identified people: check cache, enrich data, and send alerts
    const finalIdentifiedPersons = [];
    allRecognized.forEach(person => {
        // Check cache to avoid spamming notifications
        if (recognitionCache.has(person.usuario_id)) {
            const lastSeen = recognitionCache.get(person.usuario_id);
            if (now - lastSeen < CACHE_DURATION_MS) {
                logger.info(`${text_jobId} :: Persona con ID ${person.usuario_id} ya fue reconocida en los últimos 3 minutos. Saltando.`);
                return; // Skip this person
            }
        }

        const dbUser = dbUsersMap.get(parseInt(person.usuario_id, 10));
        if (dbUser) {
            // Update cache for this person
            recognitionCache.set(person.usuario_id, now);

            const enrichedPerson = {
                ...person,
                usuario_nombre: dbUser.nombre,
                usuario_tipo: dbUser.usuario_tipo,
                face_id: person.face_id || 0 // Ensure face_id exists
            };
            finalIdentifiedPersons.push(enrichedPerson);

            // Send alert if the person is a thief
            if (enrichedPerson.usuario_tipo === 'ladron') {
                notificationService.sendAlert('thief_detected', {
                    camera: camera,
                    location: camera.ubicacion,
                    timestamp: new Date().toISOString(),
                    imagePath: imageName,
                    ip: context.ip || 'N/A',
                    name: enrichedPerson.usuario_nombre,
                    usuario_id: enrichedPerson.usuario_id,
                    face_id: enrichedPerson.face_id
                });
            }
        }
    });

    // 5. Process unknown people and send alerts
    const finalUnknownPersons = [];
    crossResults.desconocidos.forEach((person, index) => {
        // Here you could add caching for unknown faces based on embeddings if desired
        const unknownPerson = {
            ...person,
            name: 'Desconocido',
            usuario_id: 0,
            face_id: index // Assign a temporary id
        };
        finalUnknownPersons.push(unknownPerson);

        notificationService.sendAlert('unknown_user', {
            camera: camera,
            location: camera.ubicacion,
            timestamp: new Date().toISOString(),
            imagePath: imageName,
            ip: context.ip || 'N/A',
            name: unknownPerson.name,
            usuario_id: unknownPerson.usuario_id,
            face_id: unknownPerson.face_id
        });
    });

    // 6. Register access event for all processed persons
    const accessData = {
        personasIdentificadas: finalIdentifiedPersons,
        personasDesconocidas: finalUnknownPersons,
        camara_id: camera.camara_id
    };

    if (accessData.personasIdentificadas.length > 0 || accessData.personasDesconocidas.length > 0) {
        await registerAcceso(accessData).catch(err => logger.error(`${text_jobId} :: Error registrando visita en segundo plano:`, err));
    }

    logger.debug(`${text_jobId} :: Procesamiento de reconocimiento finalizado.`);
    return accessData;
}

module.exports = {
    handleRecognitionResults
};