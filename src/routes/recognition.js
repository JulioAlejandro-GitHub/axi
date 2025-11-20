const { Router } = require('express');
const { faceMatchImg } = require('../controllers/recognition.js');
const { enrollUser } = require('../controllers/enrollment.js');
const { validarArchivoSubir } = require('../middlewares');

const router = Router();

router.post(
    '/img',
    [
        validarArchivoSubir,
    ],
    faceMatchImg
);

router.post(
    '/enroll',
    [
        validarArchivoSubir,
    ],
    enrollUser
);

module.exports = router;
