const { response, request } = require('express');
const jwt = require('jsonwebtoken');

const validarJWT = ( req = request, res = response, next ) => {
    const authHeader = req.header('Authorization');

    if ( !authHeader || !authHeader.startsWith('Bearer ') ) {
        return res.status(401).json({
            msg: 'No token provided or invalid format. The token must be in the format: Bearer <token>'
        });
    }

    try {
        const token = authHeader.split(' ')[1];
        const payload = jwt.verify( token, process.env.SECRETORPRIVATEKEY );
        
        // Attach user info (uid and tipo) to the request object
        req.user = payload;

        next();

    } catch (error) {
        res.status(401).json({
            msg: 'Invalid token.'
        });
    }
}

module.exports = {
    validarJWT
}