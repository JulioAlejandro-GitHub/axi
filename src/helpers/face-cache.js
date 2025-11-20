const { BD_SelAccesoUsuario } = require('../database/usuario');
const { decryptData } = require('./crypto-helper');
const config = require('../../config/config');
const logger = require('./logger');

class FaceCache {
    constructor() {
        if (FaceCache.instance) {
            return FaceCache.instance;
        }
        this.knownFaces = [];
        this.lastRefreshed = null;
        this.cacheTTL = config.cache.faceCacheTTL;
        FaceCache.instance = this;
    }

    async loadFaces() {
        try {
            logger.debug('Refreshing face cache from database...');
            const result = await BD_SelAccesoUsuario();
            if (result.rows && result.rows.length > 0) {
                this.knownFaces = result.rows.map(face => {
                    try {
                        return {
                            ...face,
                            embedding: decryptData(face.embedding),
                            mesh: face.mesh
                            // mesh: decryptData(face.mesh)
                        };
                    } catch (e) {
                        logger.error(`Failed to decrypt face data for acceso_id ${face.acceso_id}. It might be unencrypted or corrupted.`, e);
                        // Return the original face data to avoid breaking the application
                        return face;
                    }
                });
            } else {
                this.knownFaces = [];
            }
            this.lastRefreshed = Date.now();
            logger.info(`Face cache updated with ${this.knownFaces.length} faces.`);
        } catch (error) {
            logger.error('Error loading faces into cache:', error);
            this.knownFaces = [];
        }
    }

    async getKnownFaces() {
        const isCacheStale = !this.lastRefreshed || (Date.now() - this.lastRefreshed > this.cacheTTL);
        if (isCacheStale) {
            await this.loadFaces();
        }
        return this.knownFaces;
    }

    async refresh() {
        const activeEngines = (process.env.RECOGNITION_ENGINES).split(',');
        // Initialize only the active engines
        if (activeEngines.includes('human')) {
            logger.debug('Manual face cache refresh requested.');
            await this.loadFaces();
        }
    }
}

// Export a singleton instance
const instance = new FaceCache();
module.exports = instance;
