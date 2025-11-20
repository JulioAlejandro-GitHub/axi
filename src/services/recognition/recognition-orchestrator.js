const config = require('../../../config/config');
const { crossValidate } = require('../../helpers/cross-validator');
const logger = require('../../helpers/logger');

// Import engine classes
const HumanEngine = require('./engines/human-engine');
const CompreFaceEngine = require('./engines/compreface-engine');
const InsightFaceEngine = require('./engines/insightface-engine');

class RecognitionOrchestrator {
    constructor() {
        this.engines = [];
        this.activeEngines = (process.env.RECOGNITION_ENGINES).split(',');

        logger.info(`Orchestrator active engines: [${this.activeEngines.join(', ')}]`);

        // Initialize only the active engines
        if (this.activeEngines.includes('human')) {
            this.engines.push(new HumanEngine(config));
        }
        if (this.activeEngines.includes('compreface')) {
            // CompreFace engine is stateless in this refactored version, so no complex init needed.
            this.engines.push(CompreFaceEngine);
        }
        if (this.activeEngines.includes('insightface')) {
            this.engines.push(InsightFaceEngine);
        }

        // We can add more engines here based on config
        // e.g., if (this.activeEngines.includes('deepface')) { ... }
    }

    /**
     * Runs recognition on all active engines in parallel and returns their raw results.
     * @param {Buffer} imageBuffer - The image buffer to be processed.
     * @param {object} context - Additional context for the recognition task.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of results from each engine.
     */
    async runEngines(imageBuffer, context) {
        const recognitionPromises = this.engines.map(engine => engine.recognize(imageBuffer, context));
        const results = await Promise.allSettled(recognitionPromises);

        const fulfilledResults = results
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value);

        if (results.some(r => r.status === 'rejected')) {
            results.forEach(result => {
                if (result.status === 'rejected') {
                    logger.error('An engine failed during recognition:', result.reason);
                }
            });
        }

        return fulfilledResults;
    }

    /**
     * Orchestrates the full recognition pipeline: runs engines and cross-validates the results.
     * @param {Buffer} imageBuffer - The image buffer to be processed.
     * @param {object} context - Additional context for the recognition task.
     * @returns {Promise<object>} The final, cross-validated recognition result.
     */
    async orchestrate(imageBuffer, context) {
        const engineResults = await this.runEngines(imageBuffer, context);

        const humanResult = engineResults.find(r => r.engine === 'human');
        const comprefaceResult = engineResults.find(r => r.engine === 'compreface');
        const insightResult = engineResults.find(r => r.engine === 'insightface');


        // logger.error(`humanResult [${JSON.stringify(humanResult)}]`);
        // logger.error(`comprefaceResult [${JSON.stringify(comprefaceResult)}]`);


        // The cross-validator can handle cases where one engine might fail and a result is undefined.
        const finalResults = await crossValidate(comprefaceResult, humanResult, context.img.name);

        return finalResults;
    }
}

// Export the class, not a singleton instance, for better testability.
module.exports = RecognitionOrchestrator;
