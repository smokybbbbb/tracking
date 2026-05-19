import {
  FaceLandmarker,
  ObjectDetector,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import { FILTERS, drawFilter } from './filters.js';

// ─── State ───────────────────────────────────────────────────────
const layers = {
  mesh: true, contours: true, iris: true,
  landmarks: false, blend: false, obj: true, label: true
};
let mode = 'both';
let activeFilter = 'none';

// ─── Color palette ────────────────────────────────────────────────
const CLASS_COLORS = [
  '#0071e3','#30d158','#ff375f','#ff9f0a','#5e5ce6',
  '#64d2ff','#ff6961','#32ade6','#ffd60a','#30b0c7',
  '#ac8e68','#5ac8fa','#ff2d55','#34c759','#af52de',
];
const classColorMap = {};

function getClassColor(name) {
  if (!classColorMap[name]) {
    classColorMap[name] = CLASS_COLORS[Object.keys(classColorMap).length % CLASS_COLORS.length];
  }
  return classColorMap[name];
}

// ─── DOM refs ─────────────────────────────────────────────────────
const video       = document.getElementById('video');
const canvas      = document.getElementById('canvas');
const ctx         = canvas.getContext('2d');
const statusDot   = document.getElementById('statusDot');
const statusText  = document.getElementById('statusText');
const overlay     = document.getElementById('loadingOverlay');
const loadingTxt  = document.getElementById('loadingText');
const fpsEl       = document.getElementById('fps');
const faceCountEl = document.getElementById('faceCount');
const faceInferEl = document.getElementById('faceInfer');
const objCountEl  = document.getElementById('objCount');
const objInferEl  = document.getElementById('objInfer');
const objListEl   = document.getElementById('objList');
const bsContainer = document.getElementById('bsContainer');
const bsCard      = document.getElementById('bsCard');

let frameCount = 0, lastFpsTime = performance.now();

// ─── Public API ───────────────────────────────────────────────────
window.toggle = (k) => {
  layers[k] = !layers[k];
  document.getElementById('chip' + k.charAt(0).toUpperCase() + k.slice(1))
    .classList.toggle('active', layers[k]);
  if (k === 'blend') bsCard.style.display = layers.blend ? 'block' : 'none';
};

window.setMode = (m) => {
  mode = m;
  document.querySelectorAll('.tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === m)
  );
};

window.setFilter = (id) => {
  activeFilter = id;
  document.querySelectorAll('.filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === id)
  );
};

function buildFilterStrip() {
  const strip = document.getElementById('filterStrip');
  FILTERS.forEach(f => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn' + (f.id === 'none' ? ' active' : '');
    btn.dataset.filter = f.id;
    btn.innerHTML = `<span class="filter-emoji">${f.emoji}</span><span class="filter-name">${f.label}</span>`;
    btn.onclick = () => window.setFilter(f.id);
    strip.appendChild(btn);
  });
}

// ─── Init ─────────────────────────────────────────────────────────
async function init() {
  loadingTxt.textContent = 'โหลด MediaPipe WASM...';
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );

  loadingTxt.textContent = 'โหลดโมเดลใบหน้า...';
  const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numFaces: 4,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: true,
  });

  loadingTxt.textContent = 'โหลดโมเดลสิ่งของ...';
  const objectDetector = await ObjectDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    scoreThreshold: 0.4,
    maxResults: 10,
  });

  loadingTxt.textContent = 'เปิดกล้อง...';
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
  });
  video.srcObject = stream;
  await new Promise(r => (video.onloadedmetadata = r));
  video.play();

  canvas.width  = video.videoWidth;
  canvas.height = video.videoHeight;

  const drawUtils = new DrawingUtils(ctx);

  overlay.classList.add('hidden');
  statusDot.classList.remove('loading');
  statusDot.classList.add('live');
  statusText.textContent = 'กำลังทำงาน';
  buildFilterStrip();

  // ─── Render loop ──────────────────────────────────────────────
  let lastVideoTime = -1;

  function renderLoop() {
    requestAnimationFrame(renderLoop);
    if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;
    const now = performance.now();

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let faceResults = null, faceMs = '—';
    if (mode !== 'object') {
      const t0 = performance.now();
      faceResults = faceLandmarker.detectForVideo(video, now);
      faceMs = (performance.now() - t0).toFixed(1) + ' ms';
    }

    let objResults = null, objMs = '—';
    if (mode !== 'face') {
      const t1 = performance.now();
      objResults = objectDetector.detectForVideo(video, now);
      objMs = (performance.now() - t1).toFixed(1) + ' ms';
    }

    const nFace = faceResults?.faceLandmarks?.length ?? 0;
    for (let i = 0; i < nFace; i++) {
      drawFace(drawUtils, faceResults, i);
      if (activeFilter !== 'none') {
        drawFilter(ctx, faceResults.faceLandmarks[i], canvas.width, canvas.height, activeFilter);
      }
    }

    const detections = objResults?.detections ?? [];
    if (layers.obj) drawDetections(detections);
    updateObjList(detections);

    frameCount++;
    if (now - lastFpsTime >= 600) {
      const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
      frameCount = 0;
      lastFpsTime = now;
      fpsEl.textContent       = fps;
      faceCountEl.textContent = nFace > 0 ? `${nFace} ใบหน้า` : '—';
      faceInferEl.textContent = faceMs;
      objCountEl.textContent  = detections.length > 0 ? `${detections.length} รายการ` : '—';
      objInferEl.textContent  = objMs;
    }
  }

  renderLoop();

  // ─── Draw helpers ────────────────────────────────────────────
  function drawFace(drawUtils, faceResults, i) {
    const lm = faceResults.faceLandmarks[i];

    if (layers.mesh) {
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: 'rgba(0,113,227,0.1)', lineWidth: 0.5
      });
    }

    if (layers.contours) {
      const cs = { color: 'rgba(0,113,227,0.7)', lineWidth: 1.5 };
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,     cs);
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,      cs);
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,     cs);
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,  { color: 'rgba(0,90,200,0.75)',  lineWidth: 1.5 });
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: 'rgba(0,90,200,0.75)',  lineWidth: 1.5 });
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LIPS,          { color: 'rgba(255,55,95,0.8)',  lineWidth: 1.8 });
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,     { color: 'rgba(94,92,230,0.9)',  lineWidth: 1.8 });
      drawUtils.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,    { color: 'rgba(94,92,230,0.9)',  lineWidth: 1.8 });
    }

    if (layers.iris) {
      drawIrisCenter(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,  '#5e5ce6');
      drawIrisCenter(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, '#5e5ce6');
    }

    if (layers.landmarks) {
      drawUtils.drawLandmarks(lm, {
        color: 'rgba(0,113,227,0.5)', radius: 1.2,
        fillColor: 'rgba(0,113,227,0.5)', lineWidth: 0
      });
    }

    if (layers.blend && faceResults.faceBlendshapes?.[i] && i === 0) {
      updateBlendshapes(faceResults.faceBlendshapes[0].categories);
    }
  }

  function drawIrisCenter(landmarks, connections, color) {
    const indices = new Set();
    for (const c of connections) { indices.add(c.start); indices.add(c.end); }
    let sx = 0, sy = 0, cnt = 0;
    for (const idx of indices) { sx += landmarks[idx].x; sy += landmarks[idx].y; cnt++; }
    if (!cnt) return;
    const cx = (sx / cnt) * canvas.width;
    const cy = (sy / cnt) * canvas.height;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawDetections(detections) {
    for (const det of detections) {
      const cat   = det.categories[0];
      const label = cat.categoryName;
      const score = Math.round(cat.score * 100);
      const color = getClassColor(label);
      const { originX: x, originY: y, width: w, height: h } = det.boundingBox;

      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = hexToRgba(color, 0.07);
      ctx.fillRect(x, y, w, h);

      if (!layers.label) continue;

      const text  = `${label}  ${score}%`;
      const pad   = 6;
      const fsize = Math.max(12, Math.min(14, w * 0.12));
      ctx.font    = `600 ${fsize}px "Noto Sans", system-ui, sans-serif`;
      const tw    = ctx.measureText(text).width;
      const bh    = fsize + pad * 2;
      const by    = y - bh < 0 ? y : y - bh;

      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      const lx = canvas.width - (x + w);
      ctx.fillStyle = color;
      roundRect(ctx, lx, by, tw + pad * 2, bh, 5);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(text, lx + pad, by + fsize + pad * 0.7);
      ctx.restore();
    }
  }

  function updateObjList(detections) {
    if (!detections.length) {
      objListEl.innerHTML = '<div class="empty">ยังไม่พบสิ่งของ</div>';
      return;
    }
    const seen = {};
    for (const d of detections) {
      const name  = d.categories[0].categoryName;
      const score = d.categories[0].score;
      if (!seen[name] || seen[name] < score) seen[name] = score;
    }
    objListEl.innerHTML = Object.entries(seen).map(([name, score]) => `
      <div class="obj-item">
        <div class="obj-swatch" style="background:${getClassColor(name)}"></div>
        <span class="obj-name">${name}</span>
        <span class="obj-conf">${Math.round(score * 100)}%</span>
      </div>
    `).join('');
  }

  function updateBlendshapes(categories) {
    const active = categories.filter(c => c.score > 0.01).sort((a, b) => b.score - a.score);
    bsContainer.innerHTML = active.map(c => `
      <div class="bs-row">
        <div class="bs-header">
          <span>${c.categoryName}</span>
          <span class="bs-score">${Math.round(c.score * 100)}%</span>
        </div>
        <div class="bs-bar-bg">
          <div class="bs-bar-fill" style="width:${Math.round(c.score * 100)}%"></div>
        </div>
      </div>
    `).join('');
  }
}

// ─── Utility ──────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

init().catch(e => {
  document.getElementById('loadingText').textContent = 'เกิดข้อผิดพลาด: ' + e.message;
  console.error(e);
});
