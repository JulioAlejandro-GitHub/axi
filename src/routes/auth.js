const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares');
const { login, googleSignin, logOut, subscribe, register } = require('../controllers/auth.js');

const router = Router();

router.post('/register', register);

router.post('/login',[
    check('email', 'El correo es obligatorio').isEmail(),
    check('password', 'La contraseña es obligatoria').not().isEmpty(),
    validarCampos
],login );

router.post('/google',[
    check('id_token', 'El id_token es necesario').not().isEmpty(),
    validarCampos
], googleSignin );

router.post('/logout', logOut );

router.post('/subscribe', [
    validarJWT,
    validarCampos
], subscribe);

module.exports = router;