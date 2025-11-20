/**
 * @fileoverview Configuration for the Human library.
 * @see https://github.com/vladmandic/human
 */

require('dotenv').config();

const humanConfig = {
    /**
     * The backend to use for TensorFlow.js.
     * 'node' is recommended for server-side usage.
     * @type {('node'|'webgl'|'wasm')}
     */
    backend: 'node',

    /**
     * The base path to the models.
     * Can be a local path or a URL.
     * @type {string}
     */
    // modelBasePath: process.env.URL_human_models || 'file://models/',
    // modelBasePath: '../../human_models/',
    // modelBasePath: '../../../human_models/',
    // modelBasePath: '../human_models/',
    modelBasePath: process.env.URL_human_models || 'file://models/',

    

    // node_modules/@vladmandic/human/dist/human.node.js

    /**
     * Whether to enable debug logging.
     * @type {boolean}
     */
    debug: false,

    /**
     * Whether to run detection asynchronously.
     * @type {boolean}
     */
    async: true,

    /**
     * Image filter configuration.
     */
    filter: {
        enabled: true,
        equalization: false,
        flip: false,
    },

    /**
     * Face detection configuration.
     */
    face: {
        enabled: true,
        detector: {
            rotation: false,
            maxDetected: 10,
            minConfidence: 0.2,
            return: true,
        },
        mesh: {
            enabled: true,
        },
        iris: {
            enabled: false,
        },
        emotion: {
            enabled: false,
        },
        description: {
            enabled: true,
        },
    },

    /**
     * Body detection configuration.
     */
    body: {
        enabled: false,
    },

    /**
     * Hand detection configuration.
     */
    hand: {
        enabled: false,
    },

    /**
     * Object detection configuration.
     */
    object: {
        enabled: false,
    },

    /**
     * Segmentation configuration.
     */
    segmentation: {
        enabled: false,
    },
};

module.exports = humanConfig;
