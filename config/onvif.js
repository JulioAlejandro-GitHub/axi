/**
 * @file ONVIF Configuration
 * @author Jules
 *
 * This file contains the configuration for ONVIF camera validation.
 */

const onvifConfig = {
    // Timeout for the initial connection to the camera in milliseconds
    timeout: 5000,

    // If set to true, the validator will check for the presence of an RTSP stream URI.
    // This is a key capability for integrating with video streaming systems.
    requireRTSP: true,

    // You can add other required ONVIF capabilities here in the future.
    // For example:
    // requireImaging: true,
    // requirePTZ: false,
};

module.exports = onvifConfig;
