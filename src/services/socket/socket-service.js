const { Server } = require('socket.io');
const logger = require('../../helpers/logger');
const { socketAuthMiddleware } = require('../../middlewares/socket-auth');
let io;

/**
 * Initializes the Socket.IO server.
 * @param {http.Server} server - The HTTP server instance.
 * @returns {Server} The Socket.IO server instance.
 */
function initSocket(server) {
    io = new Server(server, {
        cors: {
            // origin: "*", // Adjust for production
            origin: "http://localhost:3000", // 👈 tu frontend
            methods: ["GET", "POST"]
        }
    });

    // Use the custom authentication middleware for all incoming connections
    io.use(socketAuthMiddleware);

    io.on('connection', (socket) => {
        logger.info(`New client connected: ${socket.id}`);

        socket.on('joinRoom', (room) => {
            socket.join(room);
            logger.info(`Socket ${socket.id} joined room ${room}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
}

/**
 * Emits an event to a specific room.
 * @param {string} room - The room to emit the event to.
 * @param {string} event - The event name.
 * @param {object} data - The data to send with the event.
 */
function emitToRoom(room, event, data) {
    if (io) {
        io.to(room).emit(event, data);
        logger.info(`Emitted event '${event}' to room '${room}'`);
    } else {
        logger.warn('Socket.IO not initialized. Cannot emit event.');
    }
}

module.exports = {
    initSocket,
    emitToRoom
};