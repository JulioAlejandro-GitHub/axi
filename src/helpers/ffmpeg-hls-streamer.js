/**
 * @file FFmpeg HLS Streamer
 * @author Jules
 *
 * This module is responsible for starting and managing FFmpeg processes
 * to convert RTSP streams from cameras into HLS (HTTP Live Streaming) format.
 */

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Starts an FFmpeg process to convert an RTSP stream to HLS.
 * The process will automatically try to restart if it fails.
 *
 * @param {object} camera - The camera object, containing connection details.
 * @returns {ffmpeg.FfmpegCommand} The ffmpeg command object.
 */
function startHlsStream(camera) {
    const rtspUrl = `rtsp://${encodeURIComponent(camera.camara_user)}:${encodeURIComponent(camera.camara_pass)}@${camera.camara_hostname}:${camera.camara_port}/cam/realmonitor?channel=1&subtype=0`;
    const streamId = `cam_${camera.camara_id}`;
    // const outputDir = path.join(__dirname, '../public/streams', streamId);
    const outputDir = path.join(process.cwd(), 'public', 'streams', streamId);

    // Create the directory for the HLS stream files if it doesn't exist.
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        logger.info(`Created HLS stream directory: ${outputDir}`);
    }

    logger.info(`[HLS] Creating ffmpeg command for camera ${camera.camara_id} at ${rtspUrl}`);

    const command = ffmpeg(rtspUrl, { timeout: 432000 }) // Set a long timeout
        .inputOptions([
            '-rtsp_transport tcp', // Use TCP for a more reliable connection
            '-loglevel error'      // Only log actual errors to keep logs clean
        ])
        .outputOptions([
            '-c:v copy',             // Copy video codec to avoid transcoding (saves CPU)
            '-tag:v hvc1',           // Add HVC1 tag for HEVC/H.265 streams compatibility with HLS
            '-c:a aac',              // Transcode audio to AAC, a common codec for HLS
            '-b:a 128k',             // Set audio bitrate
            '-ac 1',                 // Mono audio
            '-f hls',                // Output format is HLS
            '-hls_time 1',           // 2-second segment duration for better stability
            '-hls_list_size 4',      // Keep 6 segments in the playlist for a larger buffer
            '-hls_flags delete_segments+program_date_time', // Use a temp file for atomic playlist updates
            '-hls_segment_filename', `${outputDir}/segment_%03d.ts` // Segment filename pattern
        ])
        .output(`${outputDir}/stream.m3u8`);

        // '-hls_flags delete_segments+program_date_time+temp_file', // Use a temp file for atomic playlist updates

    return { command, outputDir };
}

module.exports = {
    startHlsStream,
};
