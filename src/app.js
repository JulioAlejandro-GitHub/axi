require('dotenv').config();

// Validate environment variables before doing anything else
const validateEnv = require('./helpers/validate-env');
validateEnv();

const Server = require('./core/server');
const HumanMatcherService = require('./services/human/human-matcher-service');
const config = require('../config/config');
const cameraService = require('./services/camera/camera-service');
const logger = require('./helpers/logger');

// Instantiate shared services
const humanMatcher = new HumanMatcherService(config);

const server = new Server({ humanMatcher });

async function main() {
    try {
        logger.info('--- [APP] Starting Server Initialization ---');
        await server.init();
        logger.info('--- [APP] Server Initialized, calling listen() ---');
        server.listen();
        logger.info('--- [APP] listen() called, proceeding... ---');

        // Start the camera service in the background
        // logger.info('--- [APP] Starting camera service ---');
        // await cameraService.start();
        // logger.info('--- [APP] Camera service started ---');

    } catch (error) {
        logger.error('---! CRITICAL STARTUP ERROR !---', error);
        process.exit(1); // Exit with failure code
    }
}

main().catch(error => {
    logger.error('---! UNHANDLED EXCEPTION IN MAIN !---', error);
    process.exit(1);
});