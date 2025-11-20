/**
 * @fileoverview Configuration for the CompreFace service.
 * Loads the CompreFace API URL and key from environment variables.
 */

const compreFaceConfig = {
    /**
     * The URL of the CompreFace API.
     * @type {string}
     */
    url: process.env.COMPREFACE_URL,
    port: process.env.COMPREFACE_PORT,

    /**
     * The Application ID for the CompreFace API.
     * @type {string}
     */
    appId: process.env.COMPREFACE_APP_ID,

    /**
     * The API key for the CompreFace API.
     * @type {string}
     */
    apiKey: process.env.COMPREFACE_API_KEY,
};

module.exports = compreFaceConfig;
