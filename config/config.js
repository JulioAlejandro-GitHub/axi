module.exports = {
    app: {
        port: process.env.PORT || 8080, // Changed default port to 8080 to avoid conflict with frontend
        frontendUrls: (process.env.FRONTEND_URLS || 'http://localhost:8085,http://127.0.0.1:8085,http://localhost:3000').split(','),
        logLevel: process.env.LOG_LEVEL || 'info',
    },
    paths: {
        home: '/',
        auth: '/vigilante/auth',
        usuario: '/vigilante/usuario',
        recognition: '/vigilante/recognition',
        statistics: '/vigilante/statistics',
        test: '/vigilante/test',
    },
    database: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        name: process.env.DB_NAME,
    },
    jwt: {
        secret: process.env.SECRETORPRIVATEKEY,
    },
    recognition: {
        service: process.env.RECOGNITION_SERVICE || 'human', // 'human' or 'compreface'
        compreface: {
            url: process.env.COMPREFACE_URL,
            apiKey: process.env.COMPREFACE_API_KEY,
            faceCollectionId: process.env.COMPREFACE_FACE_COLLECTION_ID,
        },
        human: {
            matchThreshold: parseFloat(process.env.HUMAN_MATCH_THRESHOLD) || 0.7,
        },
        insightface: {
            url: process.env.INSIGHTFACE_SERVICE_URL || 'http://localhost:5001/recognize'
        },
    },
    camera: {
        processingInterval: 10000, // ms
        restartDelay: 10000, // ms
        refreshInterval: 60 * 60 * 1000, // 1 hour
        fps: '2',
        imageQuality: '2',
        rtspTransport: 'tcp',
        rtspTimeout: '5000000', // microseconds
        ffmpegTimeout: 432000, // seconds
        ffmpeg: {
            hwaccel: process.env.FFMPEG_HWACCEL || null, // e.g., 'cuda', 'qsv'
            videoCodec: process.env.FFMPEG_VIDEO_CODEC || null, // e.g., 'h264_cuvid', 'h264_qsv'
        },
    },
    tempDir: process.env.TEMP_DIR || '/tmp/',
    cache: {
        faceCacheTTL: 5 * 60 * 1000, // 5 minutes
    },
    uploads: {
        path: process.env.UPLOADS_DIR || 'public/uploads',
    },
};