const winston = require('winston');
const path = require('path');
// const config = require('../../config/config');

// Ensure the logs directory exists
const fs = require('fs');
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const options = {
    file: {
        level: 'info',
        filename: path.join(logDir, 'app.log'),
        handleExceptions: true,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    },
    console: {
        level: 'debug',
        handleExceptions: true,
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    },
};

const logger = winston.createLogger({
    transports: [
        new winston.transports.File(options.file),
        new winston.transports.Console(options.console),
    ],
    exitOnError: false, // do not exit on handled exceptions
});

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
    write: function(message, encoding) {
        // use the 'info' log level so the output will be picked up by both transports
        logger.info(message.trim());
    },
};

module.exports = logger;