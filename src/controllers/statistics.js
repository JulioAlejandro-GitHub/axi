const { 
    getDetailedRecognitionLog: dbGetDetailedRecognitionLog, 
    getRecognitionSummary: dbGetRecognitionSummary, 
    getRecognitionByUser: dbGetRecognitionByUser 
} = require('../database/statistics');

const logger = require('../helpers/logger');

const getRecognitionLog = async (req, res) => {
    try {
        // Pass all query params to the database function
        const data = await dbGetDetailedRecognitionLog(req.query);
        res.json({
            data,
            query: req.query // Return sanitized query params for frontend state
        });
    } catch (error) {
        logger.error('Error getting detailed recognition log:', error);
        res.status(500).json({ msg: 'Error generating report' });
    }
};

const getRecognitionSummary = async (req, res) => {
    try {
        // Pass all query params to the database function
        const data = await dbGetRecognitionSummary(req.query);
        res.json({
            data,
            query: req.query
        });
    } catch (error) {
        logger.error('Error getting recognition summary:', error);
        res.status(500).json({ msg: 'Error generating report' });
    }
};

const getRecognitionByUser = async (req, res) => {
    try {
        // Pass all query params to the database function
        const data = await dbGetRecognitionByUser(req.query);
        res.json({
            data,
            query: req.query
        });
    } catch (error) {
        logger.error('Error getting recognition by user:', error);
        res.status(500).json({ msg: 'Error generating report' });
    }
};

module.exports = {
    getRecognitionLog,
    getRecognitionSummary,
    getRecognitionByUser
};