const crypto = require('crypto');

// Asegúrate de que las variables de entorno están definidas.
// En producción, utiliza un gestor de secretos para manejar estas claves.
const secretKey = process.env.CRYPTO_SECRET_KEY || 'default_secret_key_32_chars_!!';
const iv = process.env.CRYPTO_IV || 'default_iv_16_chars!';

if (secretKey.length !== 32) {
    throw new Error('CRYPTO_SECRET_KEY must be 32 characters long.');
}

if (iv.length !== 16) {
    throw new Error('CRYPTO_IV must be 16 characters long.');
}

const algorithm = 'aes-256-cbc';

/**
 * Encrypts a JSON object.
 * @param {object} data The object to encrypt.
 * @returns {string} The encrypted data as a hex string.
 */
function encryptData(data) {
    if (data === null || data === undefined) {
        return null;
    }
    const text = JSON.stringify(data);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

/**
 * Decrypts data back into a JSON object.
 * @param {string} encryptedData The encrypted data as a hex string.
 * @returns {object} The decrypted object.
 */
function decryptData(encryptedData) {
    if (encryptedData === null || encryptedData === undefined) {
        return null;
    }
    try {
        const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey), Buffer.from(iv));
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return JSON.parse(decrypted);
    } catch (error) {
        // Si la desencriptación falla (ej. los datos no estaban encriptados),
        // devuelve los datos originales o maneja el error como sea apropiado.
        console.error("Failed to decrypt data. It might not be encrypted.", error);
        return encryptedData; // Devuelve el dato original para evitar romper el flujo
    }
}

module.exports = {
    encryptData,
    decryptData
};