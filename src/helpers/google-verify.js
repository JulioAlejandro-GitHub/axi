const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleVerify = async (idToken = '') => {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const {
      name: nombre,
      picture: img,
      email: correo
    } = ticket.getPayload();

    return { nombre, img, correo };

  } catch (error) {
    return { error };
  }
}

module.exports = {
  googleVerify
}