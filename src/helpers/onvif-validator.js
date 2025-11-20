/**
 * @file ONVIF Camera Validator
 * @author Jules
 *
 * This module is responsible for connecting to ONVIF cameras
 * and validating their compatibility with the system.
 */

const onvif = require('node-onvif');
const logger = require('./logger');
const onvifConfig = require('../../config/onvif');

/**
 * Parses an ONVIF connection URI from the camera name field.
 * @param {object} camera - The camera object from the database.
 * @returns {object|null} An object with hostname, port, user, and pass, or null if parsing fails.
 *
 * @example
 * // Assuming camera.nombre is 'on v. if://admin:password123@192.168.1.108:80'
 * parseCameraURI(camera)
 * // returns { hostname: '192.168.1.108', port: 80, user: 'admin', pass: 'password123' }
 */
const parseCameraURI = (camera) => {
    try {
        if (camera.protocolo == 'onvif') {
            return {
                hostname: camera.camera_hostname,
                port: camera.camera_port,
                user: camera.camera_user,
                pass: camera.camera_pass
            };
        }else{
            // por defecto es webcam
            return null;
        }
    } catch (error) {
        logger.error(`Error parsing URI for camera ID ${camera.camara_id}: ${camera.nombre}`, error);
        return null;
    }
};


/**
 * Validates a single camera's ONVIF compatibility.
 * @param {object} camera - The camera object from the database.
 * @returns {Promise<object>} The augmented camera object with validation status.
 */
const validateSingleCamera = async (camera) => {
    // Add default status to the camera object
    camera.isCompatible = false;
    camera.statusMessage = 'Incompatible or offline';
    camera.rtspStreamUri = null;

    if (camera.protocolo == 'webcam') {
        camera.statusMessage = 'WebCam';
        return camera;
    }

    if (
        !camera.camara_hostname ||
        !camera.camara_user ||
        !camera.camara_pass 
    ) {
        camera.statusMessage = 'Invalid ONVIF URI in name';
        return camera;
    }

    try {
        logger.info(`Validating camera:[${camera.nombre}] camara_id:[${camera.camara_id}] at [${camera.camara_hostname}]`);

        let cam = new onvif.OnvifDevice({
            xaddr: `http://${camera.camara_hostname}/onvif/device_service`,
            user : camera.camara_user,
            pass : camera.camara_pass
        });

        await cam.init();

        // Check for RTSP stream URI if required
        if (onvifConfig.requireRTSP) {
            const rtspUrl = `rtsp://${encodeURIComponent(camera.camara_user)}:${encodeURIComponent(camera.camara_pass)}@${camera.camara_hostname}:${camera.camara_port}/cam/realmonitor?channel=1&subtype=0`;
            if (rtspUrl) {
                logger.info(`Camera ${camera.camara_id} is ONVIF compatible and has an RTSP stream.`);
                camera.isCompatible = true;
                camera.statusMessage = 'Online and compatible';
                camera.rtspStreamUri = rtspUrl;
            } else {
                logger.warn(`Camera ${camera.camara_id} is online but lacks a required RTSP stream URI.`);
                camera.statusMessage = 'Online but no RTSP stream found';
            }
        } else {
            logger.info(`Camera ${camera.camara_id} is ONVIF compatible.`);
            camera.isCompatible = true;
            camera.statusMessage = 'Online and compatible';
        }

    } catch (error) {
        logger.error(`Failed to connect to or validate camera ${camera.camara_id} (${camera.camara_hostname}): ${error.message}`);
        // The default statusMessage 'Incompatible or offline' is appropriate here.
    }

    return camera;
};

/**
 * Takes a list of cameras from the database and validates their ONVIF compatibility.
 * @param {Array<object>} cameras - An array of camera objects.
 * @returns {Promise<Array<object>>} A promise that resolves to the array of augmented camera objects.
 */
const validateCameras = async (cameras) => {
    if (!cameras || cameras.length === 0) {
        return [];
    }

    logger.info(`Starting ONVIF validation for [${cameras.length}] cameras.`);

    const validationPromises = cameras.map(validateSingleCamera);

    const results = await Promise.allSettled(validationPromises);

    // Return the camera objects from the results, now augmented with validation status
    return results.map((result, index) => {
        if (result.status === 'fulfilled') {
            return result.value;
        } else {
            // If the validation promise itself rejected (which it shouldn't due to try/catch),
            // log it and return the original camera object with an error message.
            logger.error(`Unhandled error in validator for camera ID ${cameras[index].camara_id}:`, result.reason);
            const originalCamera = cameras[index];
            originalCamera.isCompatible = false;
            originalCamera.statusMessage = 'Internal validation error';
            return originalCamera;
        }
    });
};

module.exports = {
    validateCameras,
};
