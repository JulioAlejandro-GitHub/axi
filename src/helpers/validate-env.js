const logger = require('./logger');
const config = require('../../config/config');

/**
 * Extracts required environment variables from the configuration object.
 * @param {object} configObj - The configuration object.
 * @returns {string[]} A list of required environment variable keys.
 */
function getRequiredEnvVars(configObj) {
    const requiredVars = [];
    const regex = /process\.env\.(\w+)/g;

    function traverse(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                let match;
                while ((match = regex.exec(obj[key])) !== null) {
                    if (!requiredVars.includes(match[1])) {
                        requiredVars.push(match[1]);
                    }
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                traverse(obj[key]);
            }
        }
    }

    traverse(configObj);
    return requiredVars;
}

/**
 * Validates that all required environment variables are set.
 * If any are missing, it logs a fatal error and exits the process.
 */
function validateEnv() {
    const requiredEnvVars = getRequiredEnvVars(config);
    const missingVars = requiredEnvVars.filter(v => !(v in process.env));

    if (missingVars.length > 0) {
        logger.fatal(`FATAL ERROR: Missing required environment variables: ${missingVars.join(', ')}`);
        logger.fatal('Please check your .env file or environment configuration.');
        process.exit(1);
    }

    logger.info('Environment configuration validated successfully.');
}

module.exports = validateEnv;