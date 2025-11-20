const { response } = require('express')

const esAdminRole = ( req, res = response, next ) => {
    if ( !req.user ) {
        return res.status(500).json({
            msg: 'Se quiere verificar el role sin validar el token primero'
        });
    }

    const { tipo, nombre } = req.user;
    
    if ( tipo !== 'socio' ) {
        return res.status(401).json({
            msg: `${ nombre } no es administrador - No puede hacer esto`
        });
    }

    next();
};
const noEsEmpleado = (req, res = response, next) => {
    if (!req.user) {
        return res.status(500).json({
            msg: 'Se quiere verificar el role sin validar el token primero'
        });
    }

    const { tipo, nombre } = req.user;

    if (tipo === 'empleado') {
        return res.status(401).json({
            msg: `${nombre} es un empleado y no tiene permisos para realizar esta acción.`
        });
    }

    next();
};

module.exports = {
    esAdminRole,
    noEsEmpleado
}