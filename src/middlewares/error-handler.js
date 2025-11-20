const logger = require('../helpers/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack);

    // If the error has a status code, use it. Otherwise, default to 500.
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        status: statusCode,
        message: message,
        // Include stack trace in development for easier debugging
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

module.exports = errorHandler;