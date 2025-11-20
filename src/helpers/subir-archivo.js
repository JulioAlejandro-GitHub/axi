const path = require('path');
const { v4: uuidv4 } = require('uuid');

const subirArchivo = ( files ) => {
    const extensionesValidas = ['png','jpg','jpeg','gif'];
    return new Promise( (resolve, reject) => {
        const { archivo } = files;

        if (!archivo) {
            return reject(`La archivo no es permitido - ${ extensionesValidas }`);
        }
        const nombreCortado = archivo.name.split('.');
        const extension = nombreCortado[ nombreCortado.length - 1 ];

        // Validar la extension
        if ( !extensionesValidas.includes( extension.toLowerCase() ) ) {
            return reject(`La extensión ${ extension } no es permitida - ${ extensionesValidas }`);
        }
        
        const nombreTemp = uuidv4() + '.' + extension;
        const uploadPath = path.join( __dirname, '../public/uploads/imgs/', nombreTemp ); // ok en dir privado

        archivo.mv(uploadPath, (err) => {
            if (err) {
                reject(err);
            }

            /**
             * solo por ahora
             * hay que servir la imagen desde directorio privado
             * error al servir img en reportes web
             * 
             * public/uploads/imgs/ queda como el direcctorio de las imagenes originales de las camaras o subidas
             */

            resolve( nombreTemp );
        });
    });
}

const { copyFile } = require('fs/promises');
// const { join } = require('path');
async function copyAFile(from, to) {
  try {
    await copyFile(from, to);
  } catch (err) {
    console.error(`Got an error trying to copy the file: ${err.message}`);
  }
}

module.exports = {
    subirArchivo,
    copyAFile
}