const jwt = require('jsonwebtoken');
const logger = require('../helpers/logger');

/**
 * Socket.IO middleware for validating JWT.
 * It checks for a token in the socket's handshake authentication data.
 * If the token is valid, the user payload is attached to the socket object.
 *
 * @param {import('socket.io').Socket} socket - The socket instance.
 * @param {function} next - The callback function to continue the middleware chain.
 */
const socketAuthMiddleware = (socket, next) => {
    // The token is expected to be sent in the `auth` object from the client
    const token = socket.handshake.auth.token;

    if (!token) {
        logger.warn(`Socket Auth: No token provided by socket [${socket.id}]. Connection rejected.`);
        // Create a standard Error object for the client
        const err = new Error("not authorized");
        err.data = { content: "No token provided." }; // additional details
        return next(err);
    }

    try {
        // Verify the token using the same secret key as the main application
        const payload = jwt.verify(token, process.env.SECRETORPRIVATEKEY);
        
        // Attach the user payload to the socket object for use in other event handlers
        socket.user = payload;
        
        logger.info(`Socket Auth: Token validated for user UID [${payload.uid}]. Socket [${socket.id}] authorized.`);
        next(); // Token is valid, proceed with the connection

    } catch (error) {
        logger.warn(`Socket Auth: Invalid token for socket [${socket.id}]. Error: ${error.message}. Connection rejected.`);
        // Create a standard Error object for the client
        const err = new Error("not authorized");
        err.data = { content: "Invalid token." }; // additional details
        next(err); // Token is invalid, reject the connection
    }
};

module.exports = {
    socketAuthMiddleware
};