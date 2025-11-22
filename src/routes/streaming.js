const { Router } = require('express');
const { startStream } = require('../controllers/streaming');
const { check } = require('express-validator');
const { validarCampos } = require('../middlewares');

const router = Router();

router.post('/start', [
    check('camara_id', 'camara_id es requerido').not().isEmpty(),
    validarCampos,
], startStream);

module.exports = router;