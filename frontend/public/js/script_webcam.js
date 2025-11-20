let canvasImgSend;
const deg = (rad) => Math.round((rad || 0) * 180 / Math.PI);

const humanConfig = { // user configuration for human, used to fine-tune behavior
  backend: 'webgl',
  cacheSensitivity: 0,
  debug: true,
  // modelBasePath: 'https://vladmandic.github.io/human-models/models/',
  filter: { enabled: true, equalization: false, flip: false },
  face: {
    enabled: true,
    detector: { rotation: false, maxDetected: 100, minConfidence: 0.2, return: true, square: false },
    iris: { enabled: true },
    description: { enabled: true },
    emotion: { enabled: true },
    antispoof: { enabled: true },
    liveness: { enabled: true },
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  gesture: { enabled: false },
  segmentation: { enabled: false },
};
const human = new Human.Human(humanConfig);

async function initWebCam2() {
  canvasImgSend = document.getElementById('overlayImgSend');

  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });

  const allVideos = document.querySelectorAll("video");
  allVideos.forEach(function (item) {
    let i = getNumbersInString(item.id)
    if (isNaN(i)) {
      return;
    }
    let video = document.getElementById(`inputVideo${i}`);
    if (video) {
      video.srcObject = stream;
    }
    

    // if (i == 1) {
    //   video.onloadedmetadata = () => video.play()
    // }
  });


  allVideos.forEach(function (item) {
    let i = getNumbersInString(item.id)
    let video = document.getElementById(`inputVideo${i}`);
    if (!video) {
      return;
    }
    let canvas = document.getElementById(`overlay${i}`);
    let ubicacion = video.getAttribute('ubicacion');

    // canvas.setAttribute("style", "display : none");
    // ajustaCardVideo(i);

    FaceDetecHuman(video, canvas, ubicacion, i, true);
  });
}
async function FaceDetecHuman(fuenteVideoImg, canvas, ubicacionCamara, idFuente, permanete = false) {
  const startTime = performance.now();
  human.detect(fuenteVideoImg).then((persons) => {
    if (persons && persons.face && persons.face.length > 0) {
      for (let i = 0; i < persons.face.length; i++) {
        const face = persons.face[i];
        const emotion = face.emotion?.reduce((prev, curr) => (prev.score > curr.score ? prev : curr));

        let perfil = inspectFaceHuman({
          pitch:face.rotation?.angle.pitch,
          roll:face.rotation?.angle.roll,
          yaw:face.rotation?.angle.yaw
        })

        if (perfil =='undetected') {
          console.log('perfi no encontrado next.... break.....')
          // break;
        }

        const rotation = `pitch ${deg(face.rotation?.angle.pitch)}° | roll ${deg(face.rotation?.angle.roll)}°  | yaw ${deg(face.rotation?.angle.yaw)}°`;
        const gaze = `direction ${deg(face.rotation?.gaze.bearing)}° strength ${Math.round(100 * (face.rotation.gaze.strength || 0))}%`;

        // console.log(`
        //   ---------------------------------------
        //   boxScore:${face.boxScore} 
        //   faceScore:${face.faceScore} 
        //   age:${face.age} 
        //   genderScore:${face.genderScore} 
        //   gender:${face.gender} 
        //   emotionScore:${emotion?.score} 
        //   emotion:${emotion?.emotion} 
        //   iris:${face.iris}
        //   rotation:${rotation}
        //   gaze:${gaze}
        //   camera distance: ${face.distance}m | ${Math.round(100 * face.distance / 2.54)}in
        //   check: ${Math.round(100 * face.real)}% real ${Math.round(100 * face.live)}% live
        //   real: ${face.real} live ${face.live}
        //   `);

        // human.draw.face(canvas, persons.face);
        // human.draw.canvas(persons.canvas, canvas);
        const [x, y, width, height] = face.box;
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(fuenteVideoImg, x, y, width, height, 0, 0, width, height);
        const faceImageUrl = tempCanvas.toDataURL('image/png');

        addCard({
          img: faceImageUrl,
          title: "Evaluando Acceso",
          text: 'text',
          perfil,
          ubicacionCamara,
          idFuente
        })
      }
      // human.draw.all(canvas, persons);
    } else {
      console.log('  Face: N/A');
    }

    if (permanete) {
        const endTime = performance.now();
        const detectionTime = endTime - startTime;
        const delay = Math.max(0, 10000 - detectionTime);
        setTimeout(() => FaceDetecHuman(fuenteVideoImg, canvas, ubicacionCamara, idFuente, permanete), delay);
    }
  });
}
// --- Start of new implementation ---

// Function to create a new evaluation card and add it to the DOM
function createEvaluationCard(params) {
  const { img, title, subtitle, text } = params;
  const cardId = `eval-card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const cardHtml = `
    <div class="col-12 col-sm-6 col-md-4" id="${cardId}" style="display: none;">
      <div class="card h-100 mb-4 rounded border-5 border-primary">
        <img class="card-img-top" src="${img}" alt="Face for evaluation">
        <div class="card-body">
          <h5 class="card-title">${title}</h5>
          <h6 class="card-subtitle text-muted mb-2">${subtitle}</h6>
          <p class="card-text">${text}</p>
          <div class="d-flex justify-content-between align-items-center">
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary">Ver</button>
              <button class="btn btn-sm btn-outline-secondary">Editar</button>
            </div>
            <small class="text-muted"></small>
          </div>
        </div>
      </div>
    </div>
  `;

  $('#evaluation-container').prepend(cardHtml);
  $(`#${cardId}`).fadeIn();

  return cardId;
}

// Function to update an existing card with recognition results
function updateEvaluationCard(cardId, data) {
    const { tipo, title, subtitle, text, ubicacionCamara } = data;
    const card = $(`#${cardId}`);

    if (card.length === 0) {
        console.error(`Card with ID ${cardId} not found for updating.`);
        return;
    }

    const cardElement = card.find('.card');
    const titleElement = card.find('.card-title');
    const subtitleElement = card.find('.card-subtitle');
    const textElement = card.find('.card-text');

    // Reset classes
    cardElement.removeClass("border-success border-primary border-danger bg-danger bg-info");
    textElement.removeClass("border-danger border-info bg-danger");

    if (title) titleElement.html(title);
    if (subtitle) subtitleElement.html(subtitle);
    if (text) textElement.html(text);
    if (tipo) textElement.html(tipo);

    // Apply new classes based on result type
    switch (tipo) {
        case 'ladron':
        case 'nuevo':
            cardElement.addClass("border-danger bg-danger");
            textElement.addClass("border-danger bg-danger");
            playSound('sound_alert_1');
            break;
        case 'socio':
        case 'empleado':
        case 'familia':
            cardElement.addClass("border-success");
            if (ubicacionCamara === 'Ingreso') playSound('sound_ok_1');
            break;
        default:
            cardElement.addClass("border-info"); // A neutral color for unknown/default
            if (ubicacionCamara === 'Ingreso') playSound('sound_ok_2');
            break;
    }

    // Set a timer to remove the card after a few seconds
    setTimeout(() => {
        $(`#${cardId}`).fadeOut(1000, function() {
            $(this).remove();
        });
    }, 10000); // Card will be removed after 10 seconds
}

async function addCard(params) {
  const { img, title, text, perfil, ubicacionCamara, idFuente } = params;
  const now = new Date();
  const datestring = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;

  // Create a new card with "Evaluating..." status
  const cardId = createEvaluationCard({
    img: img,
    title: title,
    subtitle: `${ubicacionCamara} [${idFuente}]`,
    text: datestring,
  });

  // Send for recognition and pass the new card's ID
  SendToRecognition(img, perfil, ubicacionCamara, idFuente, cardId);
}

async function SendToRecognition(base64url, perfil, ubicacionCamara, idFuente, cardId) {
  var file = dataURLtoFile(base64url, "img_eval.png");
  let container = new DataTransfer();
  container.items.add(file);
  document.querySelector('#file_input_img').files = container.files;
  const imgToRecognition = document.getElementById('file_input_img').files[0];

  const body = new FormData();
  body.append("archivo", imgToRecognition);
  body.append("ubicacionCamara", ubicacionCamara);
  body.append("idFuente", idFuente); //camara_id
  body.append("perfil", perfil);
  body.append("camera", {
      camara_id:idFuente,
      nombre:'',
      ubicacion:ubicacionCamara,
      local_id:'',
      protocolo:'webcam',
      camara_hostname:''
  });

  try {
    const ret = await window.VigilanteAPI.recognizeImage(body);
    let resultData = null;

    if (ret.personasIdentificadas && ret.personasIdentificadas.length > 0) {
        const p = ret.personasIdentificadas[0]; // Assuming one primary result per image
        console.log(`Identified: ${p.nombre} (${p.tipo}), Similarity: ${p.similarity}`);
        resultData = {
            ubicacionCamara: ubicacionCamara,
            tipo: p.tipo,
            title: `${p.nombre} [${Math.round(p.similarity * 100)}%]`
        };
    } else if (ret.personasDesconocidas && ret.personasDesconocidas.length > 0) {
        const p = ret.personasDesconocidas[0];
        console.log(`Unknown person detected. Type: ${p.tipo}`);
        resultData = {
            ubicacionCamara: ubicacionCamara,
            tipo: p.tipo,
            title: `Desconocido [${Math.round(p.similarity * 100)}%]`
        };
    }

    if (resultData) {
        updateEvaluationCard(cardId, resultData);
    } else {
        // Handle case where no one was detected or an error occurred
        updateEvaluationCard(cardId, {
            tipo: 'error',
            title: 'Sin Detección',
            text: 'No se pudo procesar el rostro.'
        });
    }
  } catch (error) {
      console.error("Error during recognition request:", error.message);
      updateEvaluationCard(cardId, {
          tipo: 'error',
          title: 'Error de Red',
          text: 'La comunicación con el servidor falló.'
      });
  }
}

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

// --- End of new implementation ---
// --- Optimized playSound function ---

// A dictionary to keep track of active sound timers to prevent overlaps
const soundTimers = {};

async function playSound(idSound, duration = 2000) {
  const player = document.getElementById(idSound);

  // 1. Check if the audio element exists to prevent errors
  if (!player) {
    console.error(`Sound element with id "${idSound}" not found.`);
    return;
  }

  // 2. If a timer is already running for this sound, clear it.
  // This prevents sounds from being cut off or behaving unexpectedly if called in rapid succession.
  if (soundTimers[idSound]) {
    clearTimeout(soundTimers[idSound]);
  }

  // 3. Reset audio and play. Using async/await allows us to catch playback errors.
  player.currentTime = 0;
  try {
    await player.play();
  } catch (error) {
    // Browsers often block autoplay unless the user has interacted with the page first.
    // This catch block prevents a console error in that case.
    console.error(`Could not play sound "${idSound}":`, error);
    return; // Exit if playback fails
  }

  // 4. Set a new timer to stop the sound after the specified duration
  soundTimers[idSound] = setTimeout(() => {
    player.pause();
    player.currentTime = 0;
    delete soundTimers[idSound]; // Clean up the timer reference from our dictionary
  }, duration);
}
function ajustaCardVideo(i) {
  const x_id = `inputVideo${i}`;
  const z_id = `overlay${i}`;

  document.getElementById("card-img").style.width = $(`#${x_id}`).width() + 'px';
  document.getElementById("card-img").style.height = $(`#${x_id}`).height() + 'px';
  document.getElementById("myimg").style.width = $(`#${x_id}`).width() + 'px';
  document.getElementById("myimg").style.height = $(`#${x_id}`).height() + 'px';
  document.getElementById("overlayImgSend").style.width = $(`#${x_id}`).width() + 'px';
  document.getElementById("overlayImgSend").style.height = $(`#${x_id}`).height() + 'px';

  // document.getElementById(z_id).style.width = $(`#${x_id}`).width() + 'px';
  // document.getElementById(z_id).style.height = $(`#${x_id}`).height() + 'px';
  
  // document.getElementById(z_id).style.width = '100%';
  // document.getElementById(z_id).style.height = '100%';

  return true;
}
function sendImgToRecognition(
  urlImg = 'http://localhost:8888/myapp/public/img/7.jpeg'
) {
  const myimg = document.getElementById('myimg');
  FaceDetecHuman(myimg, canvasImgSend, 'ImgSend', 0, false);
}
function getNumbersInString(string) {
  var tmp = string.split("");
  var map = tmp.map(function (current) {
    if (!isNaN(parseInt(current))) {
      return current;
    }
  });

  var numbers = map.filter(function (value) {
    return value != undefined;
  });

  return numbers.join("");
}
/*
inspectFaceHuman
Pitch >= -45 y <= -15 =  abajo 
Pitch >= -15 y <=   0 =  front
Pitch >=  15 y <=  45 =  top

Pitch: deve estar entre estos parametros, mas cerca del cero ::: -15,	0,	15

Yaw >= -45 y <= -15 =  right 
Yaw >= -15 y <=   0 =  front
Yaw >=  15 y <=  45 =  left

Roll >= -45 y <= -15 =  right 
Roll >= -15 y <=   0 =  front
Roll >=  15 y <=  45 =  left
*/
 function inspectFaceHuman(element) {
  let { pitch,  yaw, roll} = element;

  pitch = deg(pitch)
  yaw = deg(yaw)
  roll = deg(roll)

  // console.log(`pitch ${pitch} | roll ${roll}  | yaw ${yaw}`)
  let state = "undetected";

  if ( 
    (pitch < -15 || pitch > 15)
  ) {
    return state;
  }
  if ( 
    (yaw < -45 || yaw > 45) 
  ) {
    return state;
  }

  if ( pitch >= -15 && pitch <= 15 ) {
    state = "front";
  }
  if ( yaw >= -45 && yaw <= -15 ) {
    state = "right";
  }
  if ( yaw >= -15 && yaw <= 0 ) {
    state = "front";
  }
  if ( yaw >= 15 && yaw <= 45 ) {
    state = "left";
  }
  return state;
}