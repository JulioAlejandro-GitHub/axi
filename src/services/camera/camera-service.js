const ffmpeg = require('fluent-ffmpeg');
const { BD_GetOnvifCameras, BD_sel_Webcam, BDupdCamara } = require('../../database/usuario');
const { startHlsStream } = require('../../helpers/ffmpeg-hls-streamer');
const { getQueue, PRIORITY_LEVELS } = require('../queue/queue-service');
const humanDetector = require('../human/detector');
const { initialize: initializeHumanDetector } = require('../human/detector');
const logger = require('../../helpers/logger');
const fs = require('fs');
const path = require('path');
const config = require('../../../config/config');

class CameraService {
    constructor() {
        this.cameras = [];
        this.activeStreams = new Map(); // To keep track of active ffmpeg commands for image capture
        this.activeHlsStreams = new Map(); // To keep track of active ffmpeg commands for HLS streaming
    }

    async start() {
        logger.info('CameraService started. Initializing camera processing loop.');
        // The initializeHumanDetector() is no longer awaited here to prevent blocking.
        // The detect function will handle waiting for the models to be ready on-demand.
        this.processCameras();
        // Set up a recurring loop to check for new/updated cameras periodically
        setInterval(() => this.processCameras(), config.camera.refreshInterval);
    }

    async processCameras() {
        logger.info('Fetching and validating ONVIF cameras...');
        try {
            const dbCameras = await BD_GetOnvifCameras();
            if (!dbCameras || dbCameras.length === 0) {
                logger.info('No active ONVIF cameras found. Waiting for next check.');
                return;
            }

            this.cameras = dbCameras;
            logger.info(`Found ${this.cameras.length} compatible ONVIF cameras.`);

            this.cameras.forEach(camera => {
                // Start the image capture process for facial recognition if not already running
                if (!this.activeStreams.has(camera.camara_id)) {
                    this.processStream(camera);
                }
            });

        } catch (error) {
            logger.error('Error processing cameras:', error);
        }
    }

    async processStream(camera) {
        if (camera.estado !== 'Activo') {
            logger.info(`Camera ${camera.camara_id} is not 'Activo', attempting to set it to 'Activo'.`);
            await BDupdCamara({ camara_id: camera.camara_id, estado: 'Activo', local_id: camera.local_id });
        }

        const command = this._setupFfmpegCommand(camera);
        const imageStream = new (require('stream').PassThrough)();
        command.pipe(imageStream, { end: true });

        this._handleImageData(imageStream, camera);

        this.activeStreams.set(camera.camara_id, { command, imageStream, intentionallyStopped: false });
    }

    _setupFfmpegCommand(camera) {
        const rtspUrl = `rtsp://${encodeURIComponent(camera.camara_user)}:${encodeURIComponent(camera.camara_pass)}@${camera.camara_hostname}:${camera.camara_port}/cam/realmonitor?channel=1&subtype=0`;
        logger.info(`Starting to process stream for camera:[${camera.nombre}] ID:[${camera.camara_id}]`);

        const inputOptions = ['-rtsp_transport', config.camera.rtspTransport, '-timeout', config.camera.rtspTimeout];

        // Add hardware acceleration options if configured
        if (config.camera.ffmpeg.hwaccel) {
            inputOptions.push('-hwaccel', config.camera.ffmpeg.hwaccel);
            logger.info(`Using hardware acceleration: ${config.camera.ffmpeg.hwaccel}`);
        }
        if (config.camera.ffmpeg.videoCodec) {
            inputOptions.push('-c:v', config.camera.ffmpeg.videoCodec);
            logger.info(`Using video codec: ${config.camera.ffmpeg.videoCodec}`);
        }

        return ffmpeg(rtspUrl, { timeout: config.camera.ffmpegTimeout, logger: logger })
            .inputOptions(inputOptions)
            .format('image2pipe')
            .outputOptions(['-vf', `fps=${config.camera.fps}`, '-q:v', config.camera.imageQuality, '-update', '1', '-f', 'image2'])
            .on('start', (commandLine) => {
                logger.info(`FFmpeg command started for camera ${camera.camara_id}: ${commandLine}`);
            })
            .on('error', async (err, stdout, stderr) => {
                logger.error(`Error processing stream for camera ${camera.camara_id}: ${err.message}`);
                logger.error(`ffmpeg stderr for camera ${camera.camara_id}: ${stderr}`);
                await BDupdCamara({ camara_id: camera.camara_id, estado: 'Inactivo', local_id: camera.local_id });
            })
            .on('end', () => {
                const streamData = this.activeStreams.get(camera.camara_id);
                if (streamData) {
                    streamData.imageStream.removeAllListeners();
                    this.activeStreams.delete(camera.camara_id);
                }
                if (streamData && streamData.intentionallyStopped) {
                    logger.info(`Image capture stream for camera ${camera.camara_id} was intentionally stopped. Not restarting.`);
                    return;
                }
                logger.warn(`Image capture stream for camera ${camera.camara_id} ended unexpectedly. Restarting in ${config.camera.restartDelay / 1000} seconds.`);
                setTimeout(() => this.processStream(camera), config.camera.restartDelay);
            });
    }

    _handleImageData(imageStream, camera) {
        let buffer = Buffer.alloc(0);
        const SOI = Buffer.from([0xff, 0xd8]);
        const EOI = Buffer.from([0xff, 0xd9]);

        imageStream.on('data', async (chunk) => {
            buffer = Buffer.concat([buffer, chunk]);
            let soiIndex = buffer.indexOf(SOI);
            let eoiIndex = buffer.indexOf(EOI, soiIndex);

            while (soiIndex !== -1 && eoiIndex !== -1) {
                const imageBuffer = Buffer.from(buffer.subarray(soiIndex, eoiIndex + 2));
                buffer = Buffer.from(buffer.subarray(eoiIndex + 2));

                this._handleFaceDetection(imageBuffer, camera);

                soiIndex = buffer.indexOf(SOI);
                eoiIndex = buffer.indexOf(EOI, soiIndex);
            }
        });
    }
    async _handleFaceDetection(imageBuffer, camera) {
        const recognitionQueue = getQueue();
        try {
            const detectionResult = await humanDetector.detect(imageBuffer);
            if (detectionResult.face.length > 0) {
                const priority = detectionResult.face.length > 1 ? PRIORITY_LEVELS.HIGH : PRIORITY_LEVELS.NORMAL;
                logger.debug(`[${detectionResult.face.length}] faces detected. Queueing task with priority ${priority} for camera [${camera.camara_id}]`);
                const context = { camera, imageName: `stream_capture_${camera.camara_id}.jpg` };
                recognitionQueue.addTask(imageBuffer, context, priority);
            }
        } catch (error) {
            // Log the error but continue processing, as this is likely an incomplete frame
            logger.warn(`Error during face detection for camera ${camera.camara_id}: ${error.message}`);
        }
    }

    startHlsStreamForCamera(camera) {
        const outputDir = path.join(process.cwd(), 'public', 'streams', `cam_${camera.camara_id}`);

        // If a stream for this camera is already running, reuse the existing output directory.
        if (this.activeHlsStreams.has(camera.camara_id)) {
            logger.info(`[HLS] Stream for camera ${camera.camara_id} is already active.`);
            // Ensure the directory still exists in case it was removed externally.
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
                logger.info(`[HLS] Recreated missing directory: ${outputDir}`);
            }
            return { outputDir };
        }

        const { command } = startHlsStream(camera);

        command
            .on('start', (commandLine) => {
                logger.info(`[HLS] FFmpeg command started for camera ${camera.camara_id}: ${commandLine}`);
            })
            .on('error', (err, stdout, stderr) => {
                logger.error(`[HLS] Error on stream for camera ${camera.camara_id}: ${err.message}`);
            })
            .on('end', () => {
                const streamData = this.activeHlsStreams.get(camera.camara_id);
                // Only restart if it wasn't intentionally stopped
                if (streamData && streamData.intentionallyStopped) {
                    logger.info(`[HLS] Stream for camera ${camera.camara_id} was intentionally stopped. Not restarting.`);
                    this.activeHlsStreams.delete(camera.camara_id); // Clean up the map
                    return;
                }
                logger.warn(`[HLS] Stream for camera ${camera.camara_id} ended unexpectedly. Restarting in ${config.camera.restartDelay / 1000} seconds.`);
                // Clean up old segment files before restarting
                fs.readdir(outputDir, (err, files) => {
                    if (err) return;
                    for (const file of files) {
                        if (file.endsWith('.ts')) {
                            fs.unlink(path.join(outputDir, file), () => {});
                        }
                    }
                });
                this.activeHlsStreams.delete(camera.camara_id); // Clean up before restarting
                setTimeout(() => this.startHlsStreamForCamera(camera), config.camera.restartDelay);
            });

        command.run();
        this.activeHlsStreams.set(camera.camara_id, { command, intentionallyStopped: false, outputDir });
        return { outputDir };
    }

    stop() {
        logger.info('Stopping all camera services...');
        this.activeStreams.forEach((stream, camId) => {
            stream.intentionallyStopped = true;
            stream.command.kill('SIGKILL');
            logger.info(`Killed image capture stream for camera ${camId}`);
        });

        this.activeHlsStreams.forEach((stream, camId) => {
            stream.intentionallyStopped = true;
            stream.command.kill('SIGKILL');
            logger.info(`Killed HLS stream for camera ${camId}`);
        });
        this.activeHlsStreams.clear();
    }

    stopStream(camara_id) {
        const id = parseInt(camara_id, 10);
        logger.info(`Stopping stream for camera ${id}...`);
        if (this.activeStreams.has(id)) {
            const stream = this.activeStreams.get(id);
            stream.intentionallyStopped = true;
            stream.command.kill('SIGKILL');
            logger.info(`Killed image capture stream for camera ${id}`);
        }
        if (this.activeHlsStreams.has(id)) {
            const stream = this.activeHlsStreams.get(id);
            stream.intentionallyStopped = true;
            stream.command.kill('SIGKILL');
            logger.info(`Killed HLS stream for camera ${id}`);
        }
    }

    async updateCameraStatus(camara_id, estado) {
        const id = parseInt(camara_id, 10);
        logger.info(`Updating status for camera ${id} to ${estado}`);
        if (estado === 'inactivo') {
            this.stopStream(id);
        } else if (estado === 'activo') {
            if (!this.activeStreams.has(id)) {
                logger.info(`Camera ${id} is not active, starting recognition stream...`);
                try {
                    const { rows: cameras } = await BD_sel_Webcam({ local_id: 1, camara_id: id });
                    if (cameras && cameras.length > 0) {
                        const camera = cameras[0];
                        if (camera.protocolo === 'onvif') {
                            this.processStream(camera);
                        }
                    } else {
                        logger.warn(`Could not find camera details for camara_id: ${id}`);
                    }
                } catch (error) {
                    logger.error(`Error fetching camera details for camara_id ${id}:`, error);
                }
            } else {
                logger.info(`Camera ${id} recognition stream is already active.`);
            }
        }
    }
}

module.exports = new CameraService();
