
const { addFaceCollection, delFaceCollection } = require('../controllers/compreface');

// id_img_compreface = '9c0c5589-9632-47c8-abb1-aa374ee668a1';
id_img_compreface = '4aa8447b-7e40-4afa-b741-fea59e5b2d7e';

logger.debug(`delFaceCollection face to existing user -> id_img_compreface[${id_img_compreface}]`)
await delFaceCollection({image_id: id_img_compreface})