const Onvif = require('node-onvif');
const { BD_sel_Webcam } = require('../database/usuario');
const logger = require('../helpers/logger');

/**
 * Discovers ONVIF cameras on the local network.
 */
async function discoverCameras() {
  logger.info('🔎 Discovering ONVIF cameras on the network...');
  try {
    const devices = await Onvif.startProbe();
    if (devices.length === 0) {
      logger.warn('❌ No ONVIF cameras found.');
      return [];
    }
    logger.info(`✅ Found ${devices.length} ONVIF cameras.`);
    devices.forEach((device, i) => {
      logger.info(`📷 Camera ${i + 1}: XAddr: ${device.xaddrs[0]}, IP: ${device.address}`);
    });
    return devices;
  } catch (err) {
    logger.error('❌ Error during discovery:', err);
    return [];
  }
}

/**
 * Initializes a camera device and retrieves its basic information.
 * @param {number} cameraId The ID of the camera in the database.
 * @param {number} localId The ID of the location (sucursal).
 */
async function getCameraInfo(cameraId, localId) {
  logger.info(`🔎 Getting info for camera ID: ${cameraId}`);
  try {
    const { rows: cameras } = await BD_sel_Webcam({ camara_id: cameraId, local_id: localId });
    if (!cameras || cameras.length === 0) {
      throw new Error(`Camera with ID ${cameraId} not found in the database.`);
    }
    const camera = cameras[0];

    const device = new Onvif.OnvifDevice({
      xaddr: `http://${camera.camara_hostname}:${camera.camara_port}/onvif/device_service`,
      user: camera.camara_user,
      pass: camera.camara_pass
    });

    await device.init();
    logger.info(`✅ Camera ${camera.nombre} initialized successfully.`);
    const deviceInfo = device.getInformation();
    logger.info('📋 Device Information:', deviceInfo);
    return deviceInfo;

  } catch (err) {
    logger.error(`❌ Error initializing camera ${cameraId}:`, err);
    throw err;
  }
}

/**
 * Lists all media profiles for a specific camera.
 * @param {number} cameraId The ID of the camera in the database.
 * @param {number} localId The ID of the location (sucursal).
 */
async function listProfiles(cameraId, localId) {
  logger.info(`🔎 Listing profiles for camera ID: ${cameraId}`);
  try {
    const { rows: cameras } = await BD_sel_Webcam({ camara_id: cameraId, local_id: localId });
    if (!cameras || cameras.length === 0) {
      throw new Error(`Camera with ID ${cameraId} not found in the database.`);
    }
    const camera = cameras[0];

    const device = new Onvif.OnvifDevice({
      xaddr: `http://${camera.camara_hostname}:${camera.camara_port}/onvif/device_service`,
      user: camera.camara_user,
      pass: camera.camara_pass
    });

    await device.init();
    logger.info(`✅ Camera ${camera.nombre} initialized successfully.`);

    const res = await device.services.media.getProfiles();
    const profiles = res.data.GetProfilesResponse.Profiles;
    logger.info(`📺 Found ${profiles.length} profiles.`);

    for (const profile of profiles) {
      logger.info('--- Profile ---');
      logger.info('  Token:', profile.$.token);
      logger.info('  Name:', profile.Name);
      if (profile.VideoEncoderConfiguration) {
        const { Width: w, Height: h } = profile.VideoEncoderConfiguration.Resolution;
        logger.info(`  Resolution: ${w}x${h}`);
        logger.info(`  Codec: ${profile.VideoEncoderConfiguration.Encoding}`);
      }

      const uriRes = await device.services.media.getStreamUri({
        StreamSetup: { Stream: 'RTP-Unicast', Transport: 'RTSP' },
        ProfileToken: profile.$.token
      });

      const uri = uriRes.data.GetStreamUriResponse.MediaUri.Uri;
      logger.info(`🎥 RTSP URI for profile "${profile.Name}": ${uri}\n`);
    }
    return profiles;

  } catch (err) {
    logger.error(`❌ Error listing profiles for camera ${cameraId}:`, err.message || err);
    throw err;
  }
}

// Example usage block. This will only run if the script is executed directly.
if (require.main === module) {
  (async () => {
    logger.info('Running ONVIF detection script...');

    // Example: To test, you would need a valid camera ID and local ID from your DB.
    const TEST_CAMERA_ID = 1; // 👈 Replace with a real camera ID from your DB
    const TEST_LOCAL_ID = 1;  // 👈 Replace with a real local ID from your DB

    try {
      await discoverCameras();
      logger.debug('\n-------------------\n');
      await getCameraInfo(TEST_CAMERA_ID, TEST_LOCAL_ID);
      logger.debug('\n-------------------\n');
      await listProfiles(TEST_CAMERA_ID, TEST_LOCAL_ID);
    } catch (error) {
      logger.error('Error in script execution:', error.message);
    }
  })();
}

module.exports = {
  discoverCameras,
  getCameraInfo,
  listProfiles,
};