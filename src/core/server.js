const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const http = require('http');
const { initSocket } = require('../services/socket/socket-service');

const config = require('../../config/config');
const logger = require('../helpers/logger');

const { validarJWT } = require('../middlewares');
const humanMatcher = require('../services/human/human-matcher-service.js');

class Server {
    constructor({ humanMatcher }) {
        this.app = express();
        this.port = config.app.port;
        this.server = http.createServer(this.app);
        this.paths = config.paths;
        this.humanMatcher = humanMatcher; // Store the instance

        // Middlewares
        this.middlewares();

        // Rutas de mi aplicación
        this.routes();
    }

    async init() {
        // Caching is now handled on-demand.
        
        // Initialize the Human Matcher service in the background
        if (this.humanMatcher) {
            logger.debug('********* this.humanMatcher this.humanMatcher existe....');
        }else {
            logger.debug('********* this.humanMatcher this.humanMatcher no inicializado ?????....');
        }
        this.humanMatcher.initialize().catch(err => {
            logger.error('Failed to initialize Human Matcher Service during startup:', err);
        });
    }

    middlewares() {
        // CORS
        const whitelist = config.app.frontendUrls;
        const corsOptions = {
            origin: function (origin, callback) {
                // Allow requests with no origin (like mobile apps, curl) or from the whitelisted origin
                if (!origin || whitelist.includes(origin)) {
                    callback(null, true);
                } else {
                    logger.warn(`CORS: Blocked origin - ${origin}`);
                    callback(new Error('Not allowed by CORS'));
                }
            }
        };
        this.app.use(cors(corsOptions));


        // Lectura y parseo del body
        this.app.use(express.json());

        // Servir el contenido estático del frontend
        this.app.use(express.static('frontend'));
        // this.app.use(express.static('human_models'));
        

        // Servir contenido estático principal (HTML, CSS, JS del cliente) desde 'frontend/public'
        // this.app.use(express.static('frontend/public'));

        // Directorio Público para servir los streams HLS con control de caché para los manifiestos
        this.app.use('/public', express.static('public', {
            setHeaders: (res, path) => {
                if (path.endsWith('.m3u8')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                    res.setHeader('Pragma', 'no-cache');
                    res.setHeader('Expires', '0');
                }
            }
        }));

        // this.app.use( express.static("uploads") );


        // Fileupload - Carga de archivos
        this.app.use(fileUpload({
            useTempFiles: true,
            tempFileDir: config.tempDir,
            createParentPath: true
        }));
    }

    routes() {
        // Mock endpoint for enrollment status
        const enrollmentSessions = {};
        this.app.get('/enrollment-status/:sessionId', (req, res) => {
            const { sessionId } = req.params;
            if (!enrollmentSessions[sessionId]) {
                enrollmentSessions[sessionId] = { status: 'pending', timestamp: Date.now() };
                // Simulate completion after 10 seconds
                setTimeout(() => {
                    enrollmentSessions[sessionId].status = 'completed';
                }, 10000);
            }
            res.json({ status: enrollmentSessions[sessionId].status });
        });


        // Dynamically load routes
        const fs = require('fs');
        const path = require('path');
        const routesPath = path.join(__dirname, '../routes');

        fs.readdirSync(routesPath).forEach(file => {
            if (file.endsWith('.js')) {
                const routeName = path.basename(file, '.js');
                const routePath = this.paths[routeName];
                const routeModule = require(path.join(routesPath, file));

                if (routePath) {
                    // Apply JWT middleware to protected routes
                    if (['usuario', 'recognition'].includes(routeName)) {
                        this.app.use(routePath, validarJWT, routeModule);
                    } else {
                        this.app.use(routePath, routeModule);
                    }
                }
            }
        });

        // Global error handler - must be the last middleware
        this.app.use(require('../middlewares/error-handler.js'));
    }

    listen() {
        this.server.listen(this.port, () => {
            logger.info(`Servidor corriendo en puerto: ${this.port}`);
        });
        initSocket(this.server);
    }
}

module.exports = Server;