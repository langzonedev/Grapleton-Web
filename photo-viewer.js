// A separate top-layer viewer keeps the bottle details and their scroll position intact.
export function openPhotoViewer(photo, name, trigger) {
  if (!photo || document.querySelector('.photo-viewer[open]')) return;
  const viewer = document.createElement('dialog');
  viewer.className = 'photo-viewer';
  viewer.setAttribute('aria-label', 'Bottle photo');
  viewer.innerHTML = '<div class="photo-viewer-toolbar"><div class="photo-viewer-heading"><strong></strong><span>Photo</span></div>' +
    '<button type="button" class="photo-viewer-close" aria-label="Close photo">×</button></div>' +
    '<div class="photo-viewer-stage" tabindex="0" role="region" aria-label="Bottle photo. Pinch to zoom and drag to explore. Use plus or minus to zoom and arrow keys to pan.">' +
    '<img draggable="false" alt=""><p class="photo-viewer-error" role="status" hidden>Could not open this photo. Close and try again.</p></div>' +
    '<div class="photo-viewer-controls"><button type="button" aria-label="Zoom out">−</button><output aria-label="Zoom level" aria-live="polite">100%</output>' +
    '<button type="button" aria-label="Zoom in">+</button><button type="button" class="photo-viewer-reset">Reset</button></div>' +
    '<p class="photo-viewer-hint">Pinch or double-tap to zoom · Drag to explore</p>';
  viewer.querySelector('strong').textContent = name;
  const stage = viewer.querySelector('.photo-viewer-stage');
  const image = stage.querySelector('img');
  const controls = viewer.querySelectorAll('.photo-viewer-controls button');
  const output = viewer.querySelector('output');
  const source = URL.createObjectURL(photo);
  image.alt = 'Bottle photo of ' + name;
  let scale = 1, x = 0, y = 0, ready = false, closing = false;
  let gesture, lastTap, multiTouch = false;
  const pointers = new Map();
  const limit = (value, min, max) => Math.min(max, Math.max(min, value));
  const point = event => {
    const bounds = stage.getBoundingClientRect();
    return { x: event.clientX - bounds.left - bounds.width / 2, y: event.clientY - bounds.top - bounds.height / 2 };
  };
  function paint(animate = false) {
    const fit = Math.min(stage.clientWidth / (image.naturalWidth || 1), stage.clientHeight / (image.naturalHeight || 1));
    const maxX = Math.max(0, (image.naturalWidth * fit * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (image.naturalHeight * fit * scale - stage.clientHeight) / 2);
    x = limit(x, -maxX, maxX);
    y = limit(y, -maxY, maxY);
    stage.classList.toggle('photo-settling', animate);
    image.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    stage.classList.toggle('photo-zoomed', scale > 1);
    output.value = Math.round(scale * 100) + '%';
    controls[0].disabled = !ready || scale <= 1;
    controls[1].disabled = !ready || scale >= 5;
    controls[2].disabled = !ready || scale === 1;
  }
  function zoom(next, focal = { x: 0, y: 0 }, animate = true) {
    if (!ready) return;
    next = limit(next, 1, 5);
    x = focal.x - (focal.x - x) * next / scale;
    y = focal.y - (focal.y - y) * next / scale;
    scale = next;
    paint(animate);
  }
  function startGesture() {
    const points = [...pointers.values()];
    if (!points.length) { gesture = null; return; }
    const a = points[0], b = points[1];
    gesture = { x, y, scale, midpoint: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a,
      distance: b ? Math.hypot(a.x - b.x, a.y - b.y) : 0, time: performance.now(), moved: false };
  }
  stage.addEventListener('pointerdown', event => {
    if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    // Grabbing a zooming image starts at its visible position, even mid-transition.
    if (stage.classList.contains('photo-settling')) {
      const current = new DOMMatrixReadOnly(getComputedStyle(image).transform);
      scale = current.a;
      x = current.m41;
      y = current.m42;
      paint();
    }
    stage.focus({ preventScroll: true });
    stage.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, point(event));
    if (pointers.size > 1) { multiTouch = true; lastTap = null; }
    startGesture();
    stage.classList.remove('photo-settling');
  });
  stage.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || !gesture) return;
    pointers.set(event.pointerId, point(event));
    const [a, b] = pointers.values();
    const midpoint = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
    if (Math.hypot(midpoint.x - gesture.midpoint.x, midpoint.y - gesture.midpoint.y) > 8) gesture.moved = true;
    scale = b && gesture.distance ? limit(gesture.scale * Math.hypot(a.x - b.x, a.y - b.y) / gesture.distance, 1, 5) : gesture.scale;
    x = midpoint.x - (gesture.midpoint.x - gesture.x) * scale / gesture.scale;
    y = midpoint.y - (gesture.midpoint.y - gesture.y) * scale / gesture.scale;
    paint();
  });
  function release(event) {
    if (!pointers.has(event.pointerId)) return;
    const tap = event.type === 'pointerup' && !multiTouch && !gesture?.moved && performance.now() - gesture.time < 300;
    const position = point(event);
    pointers.delete(event.pointerId);
    if (tap) {
      if (lastTap && performance.now() - lastTap.time < 330 && Math.hypot(position.x - lastTap.x, position.y - lastTap.y) < 32) {
        zoom(scale > 1 ? 1 : 2.5, position);
        lastTap = null;
      } else lastTap = { ...position, time: performance.now() };
    }
    if (!pointers.size) multiTouch = false;
    startGesture();
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) stage.addEventListener(type, release);
  stage.addEventListener('wheel', event => {
    event.preventDefault();
    zoom(scale * Math.exp(-event.deltaY * .002), point(event), false);
  }, { passive: false });
  stage.addEventListener('keydown', event => {
    if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
    if (['+', '='].includes(event.key)) zoom(scale * 1.5);
    else if (event.key === '-') zoom(scale / 1.5);
    else if (event.key === '0') zoom(1);
    else if (event.key.startsWith('Arrow')) {
      if (event.key === 'ArrowLeft') x += 40;
      if (event.key === 'ArrowRight') x -= 40;
      if (event.key === 'ArrowUp') y += 40;
      if (event.key === 'ArrowDown') y -= 40;
      paint();
    }
  });
  controls[0].onclick = () => zoom(scale / 1.5);
  controls[1].onclick = () => zoom(scale * 1.5);
  controls[2].onclick = () => zoom(1);
  const resize = new ResizeObserver(() => {
    pointers.clear();
    multiTouch = false;
    lastTap = null;
    startGesture();
    paint();
  });
  function close() {
    if (closing) return;
    closing = true;
    if (window.grapletonNativeUI) window.grapletonNativeUI.closeDialog(viewer);
    else viewer.close();
  }
  viewer.querySelector('.photo-viewer-close').onclick = close;
  viewer.addEventListener('cancel', event => { event.preventDefault(); close(); });
  viewer.addEventListener('close', () => {
    resize.disconnect();
    URL.revokeObjectURL(source);
    viewer.remove();
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }, { once: true });
  image.onload = () => { ready = true; paint(); };
  image.onerror = () => { stage.querySelector('.photo-viewer-error').hidden = false; image.hidden = true; };
  document.body.append(viewer);
  viewer.showModal();
  window.grapletonNativeUI?.animateDialog(viewer);
  resize.observe(stage);
  image.src = source;
  paint();
}
