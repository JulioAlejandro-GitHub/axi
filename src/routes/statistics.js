const { Router } = require('express');
const { getMonthlyStats } = require('../database/statistics.js');
const { getRecognitionLog, getRecognitionSummary, getRecognitionByUser } = require('../controllers/statistics.js');
const { validarJWT } = require('../middlewares');

const router = Router();

router.post('/monthly', [validarJWT], async (req, res) => {
    try {
        const { startDate, endDate, tipos } = req.body;
        const stats = await getMonthlyStats(startDate, endDate, tipos);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ msg: 'Error fetching statistics' });
    }
});

router.get('/recognition-log', getRecognitionLog);
router.get('/recognition-summary', [validarJWT], getRecognitionSummary);
router.get('/recognition-by-user', [validarJWT], getRecognitionByUser);

module.exports = router;