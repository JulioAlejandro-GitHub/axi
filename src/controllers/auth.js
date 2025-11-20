const { response } = require('express');
const bcryptjs = require('bcryptjs')

const { generarJWT } = require('../helpers/generar-jwt');
const { googleVerify } = require('../helpers/google-verify');
const { BDgetUsuario, BDaddLogin, BDputUsuario } = require("../database/usuario");
// const { addSubjects } = require('./compreface');
const logger = require('../helpers/logger');

const register = async (req, res = response) => {
    try {
        logger.debug('--- ENTERING REGISTER CONTROLLER ---');
        const { nombre, email, password, tipo, estado, gender } = req.body;
        logger.debug('Request body:', req.body);

        logger.debug('Checking for existing user...');
        const existingUser = await BDgetUsuario({ email });
        logger.debug('Existing user check complete. Found:', existingUser.rows.length);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ msg: 'A user with this email already exists.' });
        }

        logger.debug('Hashing password...');
        const salt = await bcryptjs.genSalt();
        const hashedPassword = await bcryptjs.hash(password, salt);
        logger.debug('Password hashed.');

        const newUser = {
            nombre,
            email,
            password_bcryptjs: hashedPassword,
            tipo,
            estado,
            gender,
            local_id: 1
        };
        logger.debug('Creating new user object:', newUser);

        logger.debug('Calling BDputUsuario...');
        const result = await BDputUsuario(newUser);
        logger.debug('BDputUsuario result:', result);

        if (result.rows && result.rows.usuario_id) {


            // /**
            //  * crear usuario en compreFace
            //  * falta agregar la img...   sin imagen ?????
            //  */
            // logger.debug(`Adding new subject and face -> usuario_id[${result.rows.usuario_id}]`)
            // await addSubjects(result.rows.usuario_id);



            logger.debug('Sending success response...');
            res.status(201).json({
                msg: 'Usuario creado con éxito!',
                id: result.rows.usuario_id
            });
        } else {
            logger.error('User creation failed in DB, sending error response.');
            res.status(500).json({ msg: 'Failed to create user in database.', details: result.msg });
        }

    } catch (error) {
        logger.error('---! REGISTER CONTROLLER ERROR !---', error);
        res.status(500).json({
            msg: 'An unexpected error occurred during registration.'
        });
    }
};

const login = async (req, res = response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                msg: 'Email and password are required.'
            });
        }

        const usuarioResult = await BDgetUsuario({ email });
        if (usuarioResult.rows == 0) {
            return res.status(400).json({
                msg: 'Invalid credentials - user not found.'
            });
        }

        const usuario = usuarioResult.rows[0];

        if (
            usuario.estado !== 'activo' || 
            usuario.fecha_eliminacion   || 
            (
                usuario.usuario_tipo != 'socio' && 
                usuario.usuario_tipo != 'familia' && 
                usuario.usuario_tipo != 'empleado'
            )
        ) {
            return res.status(401).json({
                msg: 'User is not active.'
            });
        }

        const validPassword = await bcryptjs.compare(password, usuario.password_bcryptjs);
        if (!validPassword) {
            return res.status(400).json({
                msg: 'Invalid credentials - password mismatch.'
            });
        }

        // Almacenar en BD
        await BDaddLogin({ usuario_id: usuario.usuario_id, tipo: usuario.usuario_tipo });

        // Generar el JWT
        const token = await generarJWT(usuario.usuario_id, usuario.usuario_tipo, usuario.local_id);
        if (!token) {
            return res.status(503).json({
                msg: 'Error generating token.'
            });
        }

        return res.status(200).json({
            msg: 'ok',
            token,
            usuario: {
                nombre: usuario.nombre,
                email: usuario.email
            }
        });

    } catch (error) {
        logger.debug(error);
        res.status(500).json({
            msg: 'An unexpected error occurred. Please contact the administrator.'
        });
    }
}
const googleSignin = async (req, res = response) => {
    const { id_token } = req.body;
    try {
        const { correo, nombre, img, error } = await googleVerify(id_token);
        if (error) {
            return res.status(401).json({
                msg: 'Error verifying Google token.'
            });
        }

        const usuarioResult = await BDgetUsuario({email:correo});
        if (usuarioResult.rows == 0) {
            // Here you might want to create a new user
            return res.status(400).json({
                msg: 'Google user is not registered in the system.'
            });
        }

        const usuario = usuarioResult.rows[0];

        if ( usuario.estado !== 'activo' || usuario.fecha_eliminacion ) {
            return res.status(401).json({
                msg: 'User is not active.'
            });
        }

        // Generar el JWT
        const token = await generarJWT(usuario.usuario_id, usuario.tipo, usuario.local_id);
        if (!token) {
            return res.status(503).json({
                msg: 'Error generating token.'
            });
        }

        return res.status(200).json({
            msg: 'googleSignin OK',
            token,
            usuario: {
                nombre: usuario.nombre,
                email: usuario.email
            }
        });

    } catch (error) {
        logger.debug(error);
        res.status(400).json({
            msg: 'Google token is not valid.'
        })
    }
}
const NotificationService = require('../services/notification-service');

const logOut = async (req, res = response) => {
    try {
        // Server-side logout doesn't need to do anything with the token
        // as JWTs are stateless. The client is responsible for clearing the token.
        return res.status(200).json({
            msg: 'Logout successful.'
        });

    } catch (error) {
        logger.debug(error)
        res.status(500).json({
            msg: 'An error occurred during logout.'
        });
    }
}

const subscribe = (req, res = response) => {
    const subscription = req.body;
    NotificationService.addPushSubscription(subscription);
    res.status(201).json({});
};

module.exports = {
    login,
    googleSignin,
    logOut,
    subscribe,
    register
}