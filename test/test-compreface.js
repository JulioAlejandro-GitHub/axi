// import { CompreFace } from 'compreface-js-sdk';
const { CompreFace } = require('@exadel/compreface-js-sdk');

let api_key = "f07344d2-49c0-4316-926c-edc17e55f0a9";
let url = "http://localhost";
let port = 8000;

console.log(api_key)
console.log(url)
console.log(port)


console.log('new CompreFace')

let compreFace = new CompreFace(url, port); // set CompreFace url and port 
let recognitionService = compreFace.initFaceRecognitionService(api_key); // initialize service
let faceCollection = recognitionService.getFaceCollection(); // use face collection to fill it with known faces
let subjects = recognitionService.getSubjects(); // use subjects object to work with subjects directely







// return;


console.log('compreFace', compreFace)
console.log('recognitionService', recognitionService)
console.log('faceCollection', faceCollection)
console.log('subjects', subjects)




// Recognition
let path_to_image = "../temp/original_ef2a6541-ab9d-40d4-b37f-25fb5c5e771e.jpg";
recognitionService.recognize(path_to_image,{limit:0})
    .then(response => {
        console.log(JSON.stringify(response));
    })
    .catch(error => {
        console.log(`errorRecognition: [${error}]`)
    })

return;


// let subjects = recognitionService.getSubjects();
subjects.add("John");


// let fc = await faceCollection.list();
// console.log('fc. await faceCollection.list()', fc)
// async function fc() {
// }

// Adding faces into a face collection
 path_to_image = "./uploads/imgs/0a1e5c8f-c8db-43b8-890c-3929ec242361.png";
let name = encodeURIComponent('Julio Morales');
faceCollection.add(path_to_image, name)
    .then(response => {
        // your code
    })
    .catch(error => {
        console.log(`Oops! There is problem in uploading image ${error}`)
    })





// usar eset metodo antes de llamar a recognize... puede que dismimulla el error :: Oops! There is problem with recognizing image Error: Request failed with status code 400
let image_location = "./uploads/imgs/ffc4ff94-cabe-4edd-a658-086557a6547e.png";

let detectionService = compreFace.initFaceDetectionService(api_key);

let options = {
    limit: 0,
    det_prob_threshold: 0.8,
    face_plugins: "calculator,age,gender,landmarks",
    status: "true"
}

detectionService.detect(image_location, options)
    .then(response => {
        console.log(JSON.stringify(response));
    })
    .catch(error => {
        console.log(`Oops! There is problem with recognizing image ${error}`)
    })



// id_img_compreface = '9c0c5589-9632-47c8-abb1-aa374ee668a1';
id_img_compreface = '4aa8447b-7e40-4afa-b741-fea59e5b2d7e';
console.log(`delFaceCollection face to existing user -> id_img_compreface[${id_img_compreface}]`)

faceCollection.delete(id_img_compreface)
    .then(response => {
        console.log(JSON.stringify(response));
    })
    .catch(error => {
        console.log(`Oops! delete image ${error}`)
    })