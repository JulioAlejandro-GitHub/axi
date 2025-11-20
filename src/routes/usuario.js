const { Router } = require('express');
const { check } = require('express-validator');

const { validarJWT, validarCampos, esAdminRole } = require('../middlewares');
const { 
    delUsuario, 
    getReportAccesos, 
    getWebCam, 
    getEditImg, 
    updUnificaAcceso, 
    getUsersByBranch, 
    getCamaras,
    updCamara,
    updUsuario,
    getLiveStream,
    getCamaraOptions,
editorAccesos } = require('../controllers/usuario.js');

const router = Router();

/**
 * solo para perfil administrador
 * para que traer toda la tabla usuario ?????
 * siempre debe tener limit y where empresa local !!!
 */

router.post('/bybranch', validarJWT, getUsersByBranch);

router.delete('/:id', [
    validarJWT,
    esAdminRole,
    check('id', 'falta id v1').not().isEmpty(),
    check('nombre', 'falta nombre v1').not().isEmpty(),
    validarCampos
], delUsuario);

router.put('/upd', [
    // validarJWT,
    // esAdminRole,
    // check('usuario_id', 'falta usuario_id').not().isEmpty(),
    // validarCampos
], updUsuario);

router.get('/webcam', validarJWT, getWebCam);
router.post('/camaras', validarJWT, getCamaras);
router.post('/camaraoptions', validarJWT, getCamaraOptions);
router.post('/livestream', validarJWT, getLiveStream);
router.put('/updcamaras', [
    // validarJWT,
    // esAdminRole,
    // check('camara_id', 'falta camara_id').not().isEmpty(),
    // validarCampos
], updCamara);


router.post('/reportaccesos', validarJWT, getReportAccesos);
router.post('/editimg', validarJWT, getEditImg);
router.post('/unificaacceso', [validarJWT, esAdminRole], updUnificaAcceso);
router.post('/editoraccesos', [validarJWT, esAdminRole], editorAccesos);

module.exports = router;