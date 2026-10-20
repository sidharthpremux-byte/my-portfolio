// Interactive cursor-tracking hero visual.
// Loads frames from assets/images/hero-gaze/, decodes each into an ImageBitmap,
// and draws them to #hero-gaze-canvas, easing toward the frame the cursor's
// horizontal position points at. Frames load coarse-to-fine, so scrubbing works
// almost immediately (with big steps) and gets smoother as the rest arrive.
(function () {
  const FRAME_COUNT = 45;
  // Frame index (0-based) where the head faces the camera. Frames 0..CENTER turn
  // from full-left to front; CENTER..end turn from front to full-right.
  const CENTER_FRAME = 24;
  const FRAME_URL = (i) =>
    'assets/images/hero-gaze/frame_' + String(i + 1).padStart(3, '0') + '.webp';

  const canvas = document.getElementById('hero-gaze-canvas');
  const heroEl = document.querySelector('.hero');
  if (!canvas || !heroEl) return;

  const ctx = canvas.getContext('2d');

  const ZOOM = 1;                // 1 = full-bleed (cover); lower = smaller with margin
  const OBJECT_POSITION_X = 0.5; // horizontal crop anchor (0 = left, 1 = right)
  const OBJECT_POSITION_Y = 0.3; // vertical crop anchor (lower = keeps more headroom, crops shoulders)
  const EASE = 0.35;             // how quickly the shown frame catches up (0-1)
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  const SMOOTHING = 'medium';   // 'high' filters upscaling a bit better but costs more per frame

  const bitmaps = new Array(FRAME_COUNT);
  let displayFrame = CENTER_FRAME;
  let targetFrame = CENTER_FRAME;
  let lastDrawnIndex = -1;
  let started = false;
  let looping = false;
  let heroVisible = true;
  let cw = 0, ch = 0, heroLeft = 0; // cached geometry, measured on resize only

  function measure() {
    const r = heroEl.getBoundingClientRect();
    cw = r.width; ch = r.height; heroLeft = r.left;
  }

  function setupCanvas() {
    measure();
    canvas.width = Math.round(cw * DPR);
    canvas.height = Math.round(ch * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = SMOOTHING;
    lastDrawnIndex = -1;
  }

  // Nearest frame that has actually finished loading.
  function nearestLoaded(i) {
    if (bitmaps[i]) return i;
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (i - d >= 0 && bitmaps[i - d]) return i - d;
      if (i + d < FRAME_COUNT && bitmaps[i + d]) return i + d;
    }
    return -1;
  }

  function drawFrame(index) {
    const bmp = bitmaps[index];
    const imgAspect = bmp.width / bmp.height;
    const canvasAspect = cw / ch;
    let dw, dh;
    if (imgAspect > canvasAspect) { dh = ch; dw = ch * imgAspect; }
    else { dw = cw; dh = cw / imgAspect; }
    dw *= ZOOM; dh *= ZOOM;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(bmp, (cw - dw) * OBJECT_POSITION_X, (ch - dh) * OBJECT_POSITION_Y, dw, dh);
  }

  function refresh() {
    if (!started) return;
    const r = nearestLoaded(Math.round(displayFrame));
    if (r !== -1 && r !== lastDrawnIndex) { drawFrame(r); lastDrawnIndex = r; }
  }

  function tick() {
    displayFrame += (targetFrame - displayFrame) * EASE;
    refresh();
    if (Math.abs(targetFrame - displayFrame) > 0.01) requestAnimationFrame(tick);
    else looping = false;
  }

  function ensureLoop() {
    if (!looping) { looping = true; requestAnimationFrame(tick); }
  }

  const load = (i) =>
    new Promise((resolve, reject) => {
      const url = FRAME_URL(i);
      const im = new Image();
      im.onload = () => createImageBitmap(im).then(resolve, reject);
      im.onerror = () => reject(new Error('hero-gaze: failed to load ' + url));
      im.src = url;
    });

  // Load order: frontal frame first (what visitors see initially), then the two extremes, then coarse-to-fine.
  const order = [];
  const seen = new Set();
  [CENTER_FRAME, 0, FRAME_COUNT - 1].forEach((i) => { seen.add(i); order.push(i); });
  [8, 4, 2, 1].forEach((step) => {
    for (let i = 0; i < FRAME_COUNT; i += step) {
      if (!seen.has(i)) { seen.add(i); order.push(i); }
    }
  });

  setupCanvas();

  load(CENTER_FRAME).then((bmp) => {
    bitmaps[CENTER_FRAME] = bmp;
    started = true;
    refresh();
    canvas.classList.add('is-ready');
    order.slice(1).forEach((i) => {
      load(i).then((b) => { bitmaps[i] = b; refresh(); }).catch((err) => console.error(err));
    });
  }).catch((err) => console.error(err));

  function onResize() {
    setupCanvas();
    refresh();
  }
  if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(heroEl);
  else window.addEventListener('resize', onResize);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { heroVisible = e[0].isIntersecting; }).observe(heroEl);
  }

  window.addEventListener('mousemove', (e) => {
    if (!started || !heroVisible) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - heroLeft) / cw));
    // Screen center = facing the camera; left half turns left, right half turns right.
    targetFrame = ratio < 0.5
      ? (ratio / 0.5) * CENTER_FRAME
      : CENTER_FRAME + ((ratio - 0.5) / 0.5) * (FRAME_COUNT - 1 - CENTER_FRAME);
    ensureLoop();
  }, { passive: true });
})();
