const logger = require('./logger');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const facesDir = path.join(__dirname, '../../temp');

const { BDgetUsuario } = require('../database/usuario');

function normalizeBox_x(box,sw) {
    if (Array.isArray(box)) {
        // Human format: [x, y, width, height]
        const dat = {
            x_min: box[0],
            y_min: box[1],
            x_max: box[0] + box[2],
            y_max: box[1] + box[3],
        };
        // logger.debug(`box[${JSON.stringify(dat)}] --> [${sw}]`);
        return dat;
    }else{
        // logger.debug(`box[${JSON.stringify(box)}] --> [${sw}]`);
    }
    // Assume CompreFace format or already normalized
    return box;
}
function calculateIoU(box1, box2) {
      // Calcular coordenadas de la intersección
    const x_min_inter = Math.max(box1.x_min, box2.x_min);
    const y_min_inter = Math.max(box1.y_min, box2.y_min);
    const x_max_inter = Math.min(box1.x_max, box2.x_max);
    const y_max_inter = Math.min(box1.y_max, box2.y_max);

    // Ancho y alto de la intersección
    const inter_width  = Math.max(0, x_max_inter - x_min_inter);
    const inter_height = Math.max(0, y_max_inter - y_min_inter);
    const inter_area = inter_width * inter_height;

    // Áreas individuales
    const box1_area = (box1.x_max - box1.x_min) * (box1.y_max - box1.y_min);
    const box2_area = (box2.x_max - box2.x_min) * (box2.y_max - box2.y_min);

    const union_area = box1_area + box2_area - inter_area;

    // Evitar división por cero
    if (box1_area <= 0 || box2_area <= 0) return 0;;

    logger.debug(`evaluate BOX :: inter_area[${inter_area}] inter_width * inter_height`);
    logger.debug(`evaluate BOX :: union_area[${union_area}] box1_area + box2_area - inter_area`);
    logger.debug(`evaluate BOX :: area[${inter_area / union_area}] inter_area / union_area`);
    const area = inter_area / union_area;
    return area;

/**
 * Comparación de bounding boxes:
 * Calcular el área de intersección y el área de unión entre cada par (compreface_i, human_j).
 * Determinar el IoU (Intersection over Union):
 * 
 * IoU= (rea de interseccion / área de unión)
 * 
 * Si IoU >= 0.5, se considera que ambos rectángulos representan el mismo rostro.
 */

}
function isSameBox(boxA, boxB, iouThreshold = 0.5) {

    logger.debug(`boxA[${boxA.x_min}][${boxA.y_min}][${boxA.x_max}][${boxA.y_max}]`);
    logger.debug(`boxB[${boxB.x_min}][${boxB.y_min}][${boxB.x_max}][${boxB.y_max}]`);

    // Calcular coordenadas de la intersección
    const xA = Math.max(boxA.x_min, boxB.x_min);
    const yA = Math.max(boxA.y_min, boxB.y_min);
    const xB = Math.min(boxA.x_max, boxB.x_max);
    const yB = Math.min(boxA.y_max, boxB.y_max);

    logger.debug(`2.- Calcular coordenadas de la intersección :: [${xA}][${yA}][${xB}][${yB}]`);


    // Ancho y alto de la intersección
    const interWidth  = Math.max(0, xB - xA);
    const interHeight = Math.max(0, yB - yA);

    logger.debug(`3.- Ancho y alto de la intersección :: [${interWidth}][${interHeight}]`);

    const interArea   = interWidth * interHeight;

    logger.debug(`4.- interArea :: [${interArea}]`);


    // Áreas individuales
    const areaA = (boxA.x_max - boxA.x_min) * (boxA.y_max - boxA.y_min);
    const areaB = (boxB.x_max - boxB.x_min) * (boxB.y_max - boxB.y_min);

    logger.debug(`5.- Áreas individuales :: [${areaA}] [${areaB}]`);


    // Evitar división por cero
    if (areaA <= 0 || areaB <= 0) return { same: false, iou: 0 };

    // Calcular IoU
    const iou = interArea / (areaA + areaB - interArea);

    logger.debug(`6.- Calcular IoU :: [${iou}]`);


    // Comparar con umbral
    const same = iou >= iouThreshold;

    logger.debug(`7.- Comparar con umbral :: [${same}]`);


    return { same, iou };
}







/**
 * Compare two bounding boxes and decide if likely the same face.
 * Accepts boxes in either:
 *  - { x_min, y_min, x_max, y_max }  (snake_case)
 *  - { xmin, ymin, xmax, ymax }      (no underscore)
 *  - { left, top, width, height }    (left/top/width/height)
 *
 * Returns { iou, centerDistRatio, overlapRatioA, overlapRatioB, decision, reasons }
 *
 * Umbrales por defecto:
 *  - iou >= 0.40  => indica bastante solapamiento
 *  - centerDistRatio <= 0.25 => centros cercanos relativo al tamaño
 *
 * Ajusta umbrales según resolución/cámaras.
 */
function normalizeBox(b) {
  // Detect formats and convert to { xmin, ymin, xmax, ymax }
  if (b == null) throw new Error('box null/undefined');
  if ('x_min' in b || 'xmax' in b) {
    const xmin = b.x_min ?? b.xmin;
    const ymin = b.y_min ?? b.ymin;
    const xmax = b.x_max ?? b.xmax;
    const ymax = b.y_max ?? b.ymax;
    if ([xmin, ymin, xmax, ymax].some(v => v == null)) throw new Error('Formato de box no reconocido');
    return { xmin: +xmin, ymin: +ymin, xmax: +xmax, ymax: +ymax };
  }
  if ('left' in b && 'top' in b && 'width' in b && 'height' in b) {
    const xmin = b.left;
    const ymin = b.top;
    const xmax = b.left + b.width;
    const ymax = b.top + b.height;
    return { xmin: +xmin, ymin: +ymin, xmax: +xmax, ymax: +ymax };
  }
  throw new Error('Formato de box no soportado');
}
function area(box) {
  const w = Math.max(0, box.xmax - box.xmin);
  const h = Math.max(0, box.ymax - box.ymin);
  return w * h;
}
function iou(boxA, boxB) {
  const ixmin = Math.max(boxA.xmin, boxB.xmin);
  const iymin = Math.max(boxA.ymin, boxB.ymin);
  const ixmax = Math.min(boxA.xmax, boxB.xmax);
  const iymax = Math.min(boxA.ymax, boxB.ymax);
  const iw = Math.max(0, ixmax - ixmin);
  const ih = Math.max(0, iymax - iymin);
  const inter = iw * ih;
  const union = area(boxA) + area(boxB) - inter;
  return union === 0 ? 0 : inter / union;
}
function center(box) {
  return { x: (box.xmin + box.xmax) / 2, y: (box.ymin + box.ymax) / 2 };
}

/**
 * Main comparator:
 * options:
 *  - iouThreshold (default 0.40)
 *  - centerRatioThreshold (default 0.25)  // distancia centro / diagonal media
 *  - requireProb (optional) - if both boxes have .probability or .prob, require min
 */
function compareBoxes(rawA, rawB, options = {}) {
  const opt = {
    iouThreshold: 0.40,
    centerRatioThreshold: 0.25,
    requireProb: null, // e.g. 0.6  -> require both boxes' probability >= 0.6 if present
    ...options
  };

  const A = normalizeBox(rawA);
  const B = normalizeBox(rawB);

  const iouVal = iou(A, B);

  // distancia entre centros normalizada por la diagonal media de las cajas
  const cA = center(A);
  const cB = center(B);
  const dx = cA.x - cB.x;
  const dy = cA.y - cB.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const diagA = Math.sqrt(Math.pow(A.xmax - A.xmin, 2) + Math.pow(A.ymax - A.ymin, 2));
  const diagB = Math.sqrt(Math.pow(B.xmax - B.xmin, 2) + Math.pow(B.ymax - B.ymin, 2));
  const diagMean = Math.max(1e-6, (diagA + diagB) / 2);
  const centerDistRatio = dist / diagMean;

  // proporción de intersección respecto a cada caja (útil si una caja está dentro de la otra)
  const interArea = iouVal * (area(A) + area(B) - iouVal * (area(A) + area(B))); // no usar: corregimos abajo
  // mejor calcular overlap simple:
  const ixmin = Math.max(A.xmin, B.xmin);
  const iymin = Math.max(A.ymin, B.ymin);
  const ixmax = Math.min(A.xmax, B.xmax);
  const iymax = Math.min(A.ymax, B.ymax);
  const iw = Math.max(0, ixmax - ixmin);
  const ih = Math.max(0, iymax - iymin);
  const inter = iw * ih;
  const overlapRatioA = area(A) === 0 ? 0 : inter / area(A);
  const overlapRatioB = area(B) === 0 ? 0 : inter / area(B);

  // probability check if present
  let probCheck = true;
  const pA = rawA.probability ?? rawA.prob ?? null;
  const pB = rawB.probability ?? rawB.prob ?? null;
  if (opt.requireProb != null && (pA != null || pB != null)) {
    // si cualquiera existe, ambos deben superar el umbral
    probCheck = (pA == null ? false : pA >= opt.requireProb) && (pB == null ? false : pB >= opt.requireProb);
  }

  // Decision heuristic: combinar IoU y distancia de centros y solapamiento
  const iouPass = iouVal >= opt.iouThreshold;
  const centerPass = centerDistRatio <= opt.centerRatioThreshold;
  const containedPass = overlapRatioA >= 0.75 || overlapRatioB >= 0.75; // una caja dentro de la otra
  const decision = probCheck && (iouPass || (centerPass && (overlapRatioA > 0.25 || overlapRatioB > 0.25)) || containedPass);

  const reasons = [];
  if (!probCheck) reasons.push(`probabilities bajo el umbral ${opt.requireProb}`);
  if (iouPass) reasons.push(`IoU >= ${opt.iouThreshold} (${iouVal.toFixed(3)})`);
  if (centerPass) reasons.push(`distancia de centros baja (ratio ${centerDistRatio.toFixed(3)} <= ${opt.centerRatioThreshold})`);
  if (containedPass) reasons.push(`una caja contiene la otra (overlap alto)`);
  if (!iouPass && !centerPass && !containedPass) reasons.push('no hay solapamiento ni proximidad suficiente');

  return {
    iou: +iouVal.toFixed(6),
    centerDistRatio: +centerDistRatio.toFixed(6),
    overlapRatioA: +overlapRatioA.toFixed(6),
    overlapRatioB: +overlapRatioB.toFixed(6),
    decision,
    reasons,
    containedPass
  };
}













/**
 * Cross-validates facial recognition results from two different engines (CompreFace and Human).
 *
 * @param {object} comprefaceResult - The result object from CompreFace.
 * @param {object} humanResult - The result object from the Human library.
 * @param {string} imageName - The file path of the original image.
 * @param {number} [similarityThreshold=0.85] - The minimum similarity score to be considered a valid identification.
 * @param {number} [iouThreshold=0.7] - The minimum IoU to consider two boxes as the same face.
 * @returns {Promise<object>} A structured object containing the consolidated results.
 */
async function crossValidate(comprefaceResult, humanResult, imageName, similarityThreshold = 0.85, iouThreshold = 0.7) {
    logger.debug(`**********************************************************************************************`);
    logger.debug(`********************************               ***********************************************`);
    logger.debug(`******************************** crossValidate ***********************************************`);
    logger.debug(`********************************               ***********************************************`);
    logger.debug(`**********************************************************************************************`);


    const activeEngines = (process.env.RECOGNITION_ENGINES).split(',');
    if (typeof humanResult === 'undefined') {
        humanResult = {
            engine: 'human',
            personasDetectadas: 0,
            personasIdentificadas: [],
            personasDesconocidas: [],
            matchFaces: [],
            imgOriginal: null
        };
    }
    if (typeof comprefaceResult === 'undefined') {
        comprefaceResult = {
            engine: 'compreface',
            personasDetectadas: 0,
            personasIdentificadas: [],
            personasDesconocidas: [],
            matchFaces:[],
            imgOriginal: null
        };
    }
    // Initialize only the active engines
    if (activeEngines.includes('human')) {
    }
    if (activeEngines.includes('compreface')) {
    }





    logger.debug(`[crossValidate] INI Analisis Resultados Cruzadaos :: imagen: [${imageName}] C[${comprefaceResult.matchFaces.length}] vs H[${humanResult.matchFaces.length}]`);

    const CF_con_similarity = comprefaceResult.matchFaces.filter(obj => obj.similarity > 0);
    const CF_con_similarity_ids = CF_con_similarity.map(p => p.usuario_id);
    logger.debug(`1.- CF_con_similarity_ids[${CF_con_similarity_ids}]?????????`);

    const VH_con_similarity = humanResult.matchFaces.filter(obj => obj.similarity > 0);
    const VH_con_similarity_ids = VH_con_similarity.map(p => p.usuario_id);
    logger.debug(`2.- VH_con_similarity_ids[${VH_con_similarity_ids}]?????????`);

    const unidos = [...CF_con_similarity_ids, ...VH_con_similarity_ids];
    logger.debug(`3.- unidos[${unidos}]?????????`);

    // eliminar duplicados y dejar solo números
    const diferentes_ids = [...new Set(unidos)];

    // logger.debug(`diferentes_ids :: [${diferentes_ids}]?????????`);


    let dbUsersMap = new Map();
    if (diferentes_ids.length > 0) {// tiene id_usr y similarity
        const { rows: dbUsers } = await BDgetUsuario({ ids: diferentes_ids });
        if (dbUsers && dbUsers.length > 0) {
            dbUsers.forEach(user => dbUsersMap.set(user.usuario_id, user)); // este resultado si tiene los diferentes....
        }
    }


    let nRsulrados = 0;
    let max_result = [];
    if (comprefaceResult.matchFaces.length >= humanResult.matchFaces.length) {
        max_result['fuente'] = 'compreface';
        max_result['max'] = comprefaceResult.matchFaces.length;
        nRsulrados = comprefaceResult.matchFaces.length;
    }else if (comprefaceResult.matchFaces.length <= humanResult.matchFaces.length) {
        max_result['fuente'] = 'human';
        max_result['max'] = humanResult.matchFaces.length;
        nRsulrados = humanResult.matchFaces.length;
    }

    logger.debug(`[crossValidate] El resultado debe ser :: [${max_result['fuente']}][${max_result['max']}] rostros analizados.....`);

    /**
     * aqui se puede implementar DeepFace....
     * para verificacion de la misma imagen... mismo rostro !!!!!
     * 
debug: [crossValidate] INI Analisis Resultados Cruzadaos :: imagen: [camera_8_55e37b61-684a-4713-b535-d95bbdb2d391.jpg] C[1] vs H[1]
debug: 1.- CF_con_similarity_ids[1358]?????????
debug: 2.- VH_con_similarity_ids[1444]?????????
debug: 3.- unidos[1358,1444]?????????
debug: [crossValidate] El resultado debe ser :: [compreface][1] rostros analizados.....
debug: rostros en CompreFace : [1]
debug: rostros en Human      : [1]

debug: ******************************** R E S U M E N ***********************************************
debug: * Ambos                    : []
debug: * SoloCompreFace           : [{"img":"CompreFace_0e104f10-42e7-4aea-b78d-71f6909d977d.jpg","usuario_id":"1358","similarity":0.99554,"fuente":["compreface"],"box":[],"embedding":[],"mesh":[]}]
debug: * SoloCompreFace.length    : 1
debug: * SoloHuman                : []
debug: * Desconocidas             : []
debug: * conflicto                : []
     * 
     * 
     */

    const cfFaces = (comprefaceResult.matchFaces || []).map(face => ({ ...face, box: normalizeBox_x(face.box,'compreface') }));
    const hFaces  = (humanResult.matchFaces      || []).map(face => ({ ...face, box: normalizeBox_x(face.box,'human') }));

    logger.debug(`rostros en CompreFace : [${cfFaces.length}]`);
    logger.debug(`rostros en Human      : [${hFaces.length}]`);

    const matchedCfIndices = new Set();
    const matchedHIndices  = new Set();

    const data_response = {
        reconocidosAmbos: [],
        reconocidosSoloCompreFace: [],
        reconocidosSoloHuman: [],
        desconocidos: [],
        conflictoIdentidad: [],
    };

    // 1. Find pairs based on IoU and classify them
    logger.debug(`************************************************************************************************`);
    logger.debug(`--** 1. Find pairs based on IoU and classify them..............`);
    for (let i = 0; i < cfFaces.length; i++) { //CompreFace
        // logger.debug(`--** 1. INI - * rostro i[${i}] de [${cfFaces.length - 1}] CompreFace`);

        let bestMatch = { index: -1, iou: -1 };

        for (let j = 0; j < hFaces.length; j++) { //Human
            // logger.debug(`--** 1.0 - rostro j[${j}] de [${hFaces.length -1}] Human.  --> j[${j}] i[${i}] ? ? ? ? ? ? ? ? ? ?  [${JSON.stringify(hFaces[j].box)}]`);

            if (matchedHIndices.has(j)) {
                // logger.debug(`--** 1.0 - rostro img --> j[${j}] i[${i}] matchedHIndices.has(j) --> continue... ya esta matched en j[${j}] i[${i}]  -->  usuario_id[${cfFaces[1].usuario_id}] [${hFaces[j].usuario_id}]`);
                continue;
            };
            if (!cfFaces[i].box || !hFaces[j].box) { // como puede pasar esto????
                // logger.debug(`--** 1.0 - rostro img --> j[${j}] i[${i}] !cfFaces[i].box || !hFaces[j].box ?????? --> continue.   -->  usuario_id[${cfFaces[1].usuario_id}] [${hFaces[j].usuario_id}]`);
                continue
            }; // Skip if box is null

            const {
                iou,
                centerDistRatio,
                overlapRatioA,
                overlapRatioB,
                decision,
                reasons,
                containedPass
            } = compareBoxes(cfFaces[i].box, hFaces[j].box, { iouThreshold: 0.35, requireProb: 0.7 });

            if (containedPass) {
                bestMatch = { index: j, iou: iou };
                // logger.debug(`--** 1.0 - * Mismo BOX :: identificado en ambos..... i[${i}]CompreFace  j[${j}]Human : -->  usuario_id[${cfFaces[i].usuario_id}] [${hFaces[j].usuario_id}]`);
            }else{
                // logger.debug(`--** 1.0 - * ------ distib¡nto BOX :: Rostro identificado en ambos.....  --> j[${j}] i[${i}].  iou[${iou}] vs iouThreshold[${iouThreshold}]`);
            }
        }

        if (bestMatch.index !== -1) {

            const cfFace = cfFaces[i];
            const hFace  = hFaces[bestMatch.index];
            matchedCfIndices.add(i);
            matchedHIndices.add(bestMatch.index);

            /**
             * evaluacion de confianza %
             */
            const cfId = cfFace.similarity >= similarityThreshold ? cfFace.usuario_id : null;
            const hId  = hFace.similarity  >= similarityThreshold ? hFace.usuario_id  : null;

            // logger.debug(`bestMatch..... ?  :: evaluacion de confianza i[${i}]  cfId[${cfId}] usuario_id[${cfFace.usuario_id}][${cfFace.similarity}] --> hId[${hId}]  hId[${hId}][${hFace.similarity}]`);
            // logger.debug(typeof cfId);    // "string"
            // logger.debug(typeof hId);    // "number"

            if (cfId && hId && cfId == hId) { // ambos e iguales
                // logger.debug(`--** 1.1 - reconocidosAmbos..... ? : --> cfFaces i[${i}] :: evaluacion de confianza  cfId[${cfId}]  hId[${hId}]`);

                data_response.reconocidosAmbos.push({
                    img             : cfFace.img,
                    usuario_id      : cfId,
                    similarityAvg   : (cfFace.similarity + hFace.similarity) / 2,
                    similarity      : cfFace.similarity,
                    embedding       : hFace.embedding,
                    mesh            : hFace.mesh,
                    fuente          : ['compreface', 'human']
                });
            // } else if (cfId && hId && cfId !== hId) {
            } else if (cfId && hId && cfId != hId) { // ambos y distintos

                // logger.debug(`--** 1.2 - conflictoIdentidad -->  i[${i}].  ...... mismo rostro distintos IDs :: compreface[${cfId}] !== human[${hId}]`);
                // logger.debug(`--** 1.2 - conflictoIdentidad -->  i[${i}].  compreface[${cfId}] !== human[${hId}] hay que verificar.......`);
                // logger.debug(`--** 1.2 - conflictoIdentidad -->  i[${i}].  compreface[${cfId}] !== human[${hId}] hay que verificar.......`);
                // logger.debug(`--** 1.2 - conflictoIdentidad -->  i[${i}].  compreface[${cfId}] !== human[${hId}] hay que verificar.......`);
                // logger.debug(`--** 1.2 - conflictoIdentidad -->  i[${i}].  compreface[${cfId}] !== human[${hId}] hay que verificar.......`);
                // logger.debug(`--** 1.2 - conflictoIdentidad -->  i[${i}].  compreface[${cfId}] !== human[${hId}] hay que verificar.......`);
                /**
                 * este es el caso que hay que verificar.......
                 * esta es la instancia donde resolver este caso.....  
                 * ------ alerta distinta ?????
                 * ------ registro especial en BD tag ?????
                 */
                data_response.conflictoIdentidad.push({
                    img          : cfFace.img,
                    comprefaceId : cfId,
                    humanId      : hId,
                    usuario_id   : cfId,
                    similarity   : cfFace.similarity,
                    embedding    : hFace.embedding,
                    mesh         : hFace.mesh,
                    fuente       : ['compreface', 'human']
                });
            } else if (cfId && !hId) { // solo CompreFace

                // logger.debug(`--** 1.3- reconocidosSoloCompreFace..... ? : --> cfFaces i[${i}]`);

                /**
                 * CompreFace sin embedding mesh
                 */
                data_response.reconocidosSoloCompreFace.push({
                    img         : cfFace.img,
                    usuario_id  : cfId,
                    similarity  : cfFace.similarity,
                    fuente      : ['compreface']
                });
            } else if (!cfId && hId) { // solo Human
                // logger.debug(`--** 1.4 - reconocidosSoloHuman..... ? : --> new img  i[${i}] ?????????????????`);

                try {
                    // crear imagen.... del rostro que human identifico...
                    const imgOriginalName = `human_face_${uuidv4()}.jpg`
                    const inputPath       = path.join(facesDir, imageName);
                    const outputPath      = path.join(facesDir, imgOriginalName);

                    // logger.debug(`new img ..... [${imgOriginalName}]`);

                    await sharp(inputPath)
                        .extract({  left: hFace.box.x_min, 
                                    top: hFace.box.y_min, 
                                    width: hFace.box.x_max - hFace.box.x_min, 
                                    height: hFace.box.y_max - hFace.box.y_min })
                        .toFile(outputPath);
                } catch (error) {
                    /**
                     * este error, no debe ipedir la alerta...
                     * se envia la imagen original...
                     */
                    logger.error(`Error new img Human.... ${inputPath}:`, error);
                }

                data_response.reconocidosSoloHuman.push({
                    img         : cfFace.img,
                    usuario_id  : hId,
                    similarity  : hFace.similarity,
                    embedding   : hFace.embedding,
                    mesh        : hFace.mesh,
                    fuente      : ['human']
                });

            } else { // no Human, no CompreFace... no cuample con similarity usuario_id
                // logger.debug(`--** 1.5 - desconocidos..... ? : --> new img  i[${i}]`);
                /**
                 *      usuario_id  : .usuario_id,
                 *      similarity  : .similarity,
                 *      si tuviera de estos datos, hay que resolver aqui !!!!!!
                 */
                if (hFace.similarity >0) {
                    // logger.debug(`--** 1.5 - desconocidos..... ? : --> new img  i[${i}] hFace.similarity[${hFace.similarity}] resolver aqui !!!!!!`);
                }
                data_response.desconocidos.push({
                    img        : cfFace.img,
                    embedding  : hFace.embedding,
                    mesh       : hFace.mesh,
                    fuente     : ['compreface', 'human']
                });
            }
        }
    }

    // 2. Process unmatched CompreFace ...  solo rostros que no detecta Human...
    logger.debug(`************************************************************************************************`);
    logger.debug(`--** 2. Process unmatched CompreFace ...  solo rostros que no detecta Human...............`);
    for (let i = 0; i < cfFaces.length; i++) {

        // logger.debug(`--** 2.0 - matchedCfIndices i[${i}] : [${matchedCfIndices.has(i)}].  cfFaces[i].usuario_id [${cfFaces[i].usuario_id}]`);

        if (!matchedCfIndices.has(i)) {
            const cfFace = cfFaces[i];
            if (cfFace.similarity >= similarityThreshold && cfFace.usuario_id) {
                data_response.reconocidosSoloCompreFace.push({
                    img         : cfFace.img,
                    usuario_id  : cfFace.usuario_id,
                    similarity  : cfFace.similarity,
                    fuente      : ['compreface']
                });
            } else {
                // logger.debug(`--** 2.1 - CompreFace unmatched desconocidos i[${i}] : imageName[${imageName}]`);

                /**           
                 *      usuario_id  : .usuario_id,
                 *      similarity  : .similarity,
                 *      si tubiera de estos datos, hay que resolver aqui !!!!!!
                 */
                if (cfFace.similarity >0) {
                    // logger.debug(`--** 2.1 - CompreFace  desconocidos i[${i}] : imageName[${imageName}]  cfFace similarity[${cfFace.similarity}]->[${cfFace.usuario_id}] resolver aqui !!!!!!`);
                }
                data_response.desconocidos.push({
                    img         : cfFace.img,
                    fuente      : ['compreface'],
                });
            }
        }
    }

    // 3. Process unmatched Human .... solo rostros que no detecta CompreFace...
    logger.debug(`************************************************************************************************`);
    logger.debug(`--** 3. - Process unmatched Human .... solo rostros que no detecta CompreFace..................`);
    for (let j = 0; j < hFaces.length; j++) {
        // logger.debug(`--** 3.0 - matchedHIndices j[${j}] : [${matchedHIndices.has(j)}].   hFaces[j].usuario_id [${hFaces[j].usuario_id}]`);

        if (!matchedHIndices.has(j)) {
            logger.debug(`3. Human Process unmatched j[${j}] faces from Human: ${imageName}`);
            const hFace = hFaces[j];

            const imgOriginalName = `human_face_${uuidv4()}.jpg`
            const inputPath       = path.join(facesDir, imageName);
            const outputPath      = path.join(facesDir, imgOriginalName);
            try {
                // crear imagen.... del rostro que human identifico... por ahora solo la crea CompreFace
                logger.debug(`new img ..... [${imgOriginalName}]`);

                await sharp(inputPath)
                    .extract({  left: hFace.box.x_min, 
                                top: hFace.box.y_min, 
                                width: hFace.box.x_max - hFace.box.x_min, 
                                height: hFace.box.y_max - hFace.box.y_min })
                    .toFile(outputPath);
            } catch (error) {
                /**
                 * este error, no debe ipedir la alerta...
                 * se envia la imagen original...
                 */
                logger.error(`3.0 Human Error new img Human.... ${inputPath}:`, error);
            }

            logger.debug(`--** 3.1 - hFace.similarity..... ? : --> [${hFace.similarity}]. usuario_id[${hFace.usuario_id}]`);

            if (hFace.similarity >= similarityThreshold && hFace.usuario_id) {
                // logger.debug(`--** 3.1 - reconocidosSoloHuman..... ? : --> new img[${imgOriginalName}] usuario_id[${hFace.usuario_id}]`);

                data_response.reconocidosSoloHuman.push({
                    img         : imgOriginalName,
                    usuario_id  : hFace.usuario_id,
                    similarity  : hFace.similarity,
                    embedding   : hFace.embedding,
                    mesh        : hFace.mesh,
                    fuente      : ['human']
                });
            } else {
                // logger.debug(`--** 3.2 - desconocidos..... unmatched j[${j}] Human ? : --> new img[${imgOriginalName}]`);
                /**           
                 *      usuario_id  : .usuario_id,
                 *      similarity  : .similarity,
                 *      si tubiera de estos datos, hay que resolver aqui !!!!!!
                 * 
                 * 
                 *  esta imagen, es posible que CompreFace no la acepte..... (en el ejemplo no se puede subir... ok CompreFace)
                 * hay que aceptar estas cosas...
                 */
                if (hFace.similarity >0) {
                    // logger.debug(`--** 3.2 - desconocidos..... unmatched j[${j}] Human ? : --> new img[${imgOriginalName}] hFace.similarity[${hFace.similarity}] resolver aqui !!!!!!`);
                }
                data_response.desconocidos.push({
                    img         : imgOriginalName,
                    embedding   : hFace.embedding,
                    mesh        : hFace.mesh,
                    fuente      : ['human']
                });
            }
        }
    }





logger.debug(`**********************************************************************************************`);
logger.debug(`******************************** R E S U M E N ***********************************************`);
logger.debug(`**********************************************************************************************`);
const Ambos             = (data_response.reconocidosAmbos           || []).map(face => ({ ...face, box: [], embedding:[], mesh:[] }));
const SoloCompreFace    = (data_response.reconocidosSoloCompreFace  || []).map(face => ({ ...face, box: [], embedding:[], mesh:[] }));
const SoloHuman         = (data_response.reconocidosSoloHuman       || []).map(face => ({ ...face, box: [], embedding:[], mesh:[] }));
const Desconocidas      = (data_response.desconocidos               || []).map(face => ({ ...face, box: [], embedding:[], mesh:[] }));
const conflicto         = (data_response.conflictoIdentidad         || []).map(face => ({ ...face, box: [], embedding:[], mesh:[] }));
logger.debug(`* Ambos                    : ${JSON.stringify(Ambos)}`);
logger.debug(`* SoloCompreFace           : ${JSON.stringify(SoloCompreFace)}`); //***** solo en este lo reconnocio y esta bien por que el embedding no se guarda en BD !!! */
logger.debug(`* SoloCompreFace.length    : ${SoloCompreFace.length}`); //***** solo en este lo reconnocio y esta bien por que el embedding no se guarda en BD !!! */
logger.debug(`* SoloHuman                : ${JSON.stringify(SoloHuman)}`);
logger.debug(`* Desconocidas             : ${JSON.stringify(Desconocidas)}`);
logger.debug(`* conflicto                : ${JSON.stringify(conflicto)}`);



    /**
     * aqui falta fucionar los resultados positivos... personas reconocidas... puede ser ladron !!!!
     */
    /**
     * Todos los IDs de personas en BD...
     * Complementar datos...
     */
    const finalIdentifiedPersons = [];
    data_response.reconocidosAmbos.forEach(person => {
        const dbUser = dbUsersMap.get(parseInt(person.usuario_id, 10));
        if (dbUser) {
            const enrichedPerson = {
                ...person,
                usuario_nombre  : dbUser.nombre,
                usuario_tipo    : dbUser.usuario_tipo
            };
            finalIdentifiedPersons.push(enrichedPerson);
        }
    });
    data_response.reconocidosSoloCompreFace.forEach(person => {
        const dbUser = dbUsersMap.get(parseInt(person.usuario_id, 10));
        if (dbUser) {
            const enrichedPerson = {
                ...person,
                usuario_nombre  : dbUser.nombre,
                usuario_tipo    : dbUser.usuario_tipo
            };
            finalIdentifiedPersons.push(enrichedPerson);
        }
    });
    data_response.reconocidosSoloHuman.forEach(person => {
        const dbUser = dbUsersMap.get(parseInt(person.usuario_id, 10));
        if (dbUser) {
            const enrichedPerson = {
                ...person,
                usuario_nombre  : dbUser.nombre,
                usuario_tipo    : dbUser.usuario_tipo
            };
            finalIdentifiedPersons.push(enrichedPerson);
        }
    });
    // logger.debug(`* finalIdentifiedPersons   : ${JSON.stringify(finalIdentifiedPersons)}`);
    // logger.debug(`finalIdentifiedPersons     : [${finalIdentifiedPersons.length}]`);

    const personasDetectadas    = max_result['max'];
    const personasDesconocidas  = data_response.desconocidos;

    return {
        personasDetectadas,
        personasIdentificadas:finalIdentifiedPersons,
        personasDesconocidas,
        imgOriginal:imageName
    };
}

module.exports = {
    crossValidate,
};