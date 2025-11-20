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






// warn: box[{"probability":0.99925,"x_max":820,"y_max":227,"x_min":644,"y_min":58}] --> [compreface]
// warn: box[{"probability":0.99841,"x_max":206,"y_max":345,"x_min":33,"y_min":175}] --> [compreface]
// warn: box[{"x_min":579,"y_min":0,"x_max":898,"y_max":317}] --> [human]
// warn: box[{"x_min":0,"y_min":146,"x_max":231,"y_max":386}] --> [human]


// const box1 = { x_min: 100, y_min: 80, x_max: 220, y_max: 260, probability: 0.98 };
// const box2 = { left: 105, top: 85, width: 115, height: 180, prob: 0.95 };
const box1 = { "x_max":820,"y_max":227,"x_min":644,"y_min":58 };
const box2 = { "x_min":579,"y_min":0,"x_max":898,"y_max":317 };
// console.log(compareBoxes(box1, box2, { iouThreshold: 0.35, requireProb: 0.7 }));


const compreface_box1 = { "x_max":820,"y_max":227,"x_min":644,"y_min":58 };
const human_box1      = { "x_min":579,"y_min":0,"x_max":898,"y_max":317 };
// console.log(compareBoxes(compreface_box1, human_box1, { iouThreshold: 0.35, requireProb: 0.7 }));


// const compreface_box1 = { "x_max":820,"y_max":227,"x_min":644,"y_min":58 };
// const human_box2      = { "x_min":0,"y_min":146,"x_max":231,"y_max":386 };
// console.log(compareBoxes(compreface_box1, human_box2, { iouThreshold: 0.35, requireProb: 0.7 }));


const compreface_box2 = { "x_max":206,"y_max":345,"x_min":33,"y_min":175 };
const human_box2      = { "x_min":0,"y_min":146,"x_max":231,"y_max":386 };
// console.log(compareBoxes(compreface_box2, human_box2, { iouThreshold: 0.35, requireProb: 0.7 }));

// warn: box original ****************** [{"probability":0.99925,"x_max":820,"y_max":227,"x_min":644,"y_min":58}] --> [compreface]
// warn: box[{"probability":0.99925,"x_max":820,"y_max":227,"x_min":644,"y_min":58}] --> [compreface]

// warn: box original ****************** [{"probability":0.99841,"x_max":206,"y_max":345,"x_min":33,"y_min":175}] --> [compreface]
// warn: box[{"probability":0.99841,"x_max":206,"y_max":345,"x_min":33,"y_min":175}] --> [compreface]

// warn: box original ****************** [[579,0,319,317]] --> [human]
// warn: box[{"x_min":579,"y_min":0,"x_max":898,"y_max":317}] --> [human]

// warn: box original ****************** [[0,146,231,240]] --> [human]
// warn: box[{"x_min":0,"y_min":146,"x_max":231,"y_max":386}] --> [human]




jsonOne = [{
        "img": "791160c7-1277-4c61-90ab-b782043348e2.jpg",
        "usuario_id": "990",
        "similarity": 0.9887,
        "fuente": [
            "compreface"
        ],
        "box": [],
        "embedding": []
    }];

jsonTwo =  [{
        "img": "895885cb-4fcf-44ae-bd23-860f7ff00b4b.jpg",
        "usuario_id": "992",
        "similarity": 0.99996,
        "fuente": [
            "compreface"
        ],
        "box": [],
        "embedding": []
    }];




var jsonArray =  { jsonOne, jsonTwo };
const objetoCombinado = Object.assign(jsonOne, jsonTwo);
// console.log(`objetoCombinado = [${JSON.stringify(objetoCombinado)}]`)
// console.log(`objetoCombinado = [${objetoCombinado}]`)

const mergedObject = { ...jsonOne, ...jsonTwo };


const combined = [jsonOne, jsonTwo];
// console.log(`combined = [${JSON.stringify(combined)}]`)
// console.log(`combined = [${combined}]`)
// console.log(`combined = [${combined.length}]`)




obj_1 = {
    "img":"791160c7-1277-4c61-90ab-b782043348e2.jpg",
    "usuario_id":"990",
    "similarity":0.9887,
    "fuente":["compreface"],
    "box":[],
    "embedding":[]
};
obj_2 = {
    "img":"895885cb-4fcf-44ae-bd23-860f7ff00b4b.jpg",
    "usuario_id":"992",
    "similarity":0.99996,
    "fuente":["compreface"],
    "box":[],
    "embedding":[]
}

// ✅ Combinar en un array
const resultado = [obj_1, obj_2];

console.log(resultado);