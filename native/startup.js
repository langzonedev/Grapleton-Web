// This markup is included in the native HTML so it paints before the app bundle runs.
export const startupMarkup = `<div id="native-startup" role="status" aria-label="Opening Grapleton">
  <svg class="startup-glass" viewBox="0 0 512 512" aria-hidden="true">
    <defs><clipPath id="startup-bowl"><path d="M191 148C187 184 169 213 169 246C169 286 204 316 251 316C296 316 334 284 334 244C334 213 318 180 313 148Z"/></clipPath></defs>
    <image href="./assets/grapleton-v4-512.png" width="512" height="512"/>
    <g clip-path="url(#startup-bowl)">
      <path fill="#360d20" d="M150 145h200v190H150z"/>
      <g class="startup-wine">
        <path fill="#a52650" d="M132 246C209 289 274 182 364 226V354H132Z"/>
        <path fill="none" stroke="#db527b" stroke-width="7" d="M132 246C209 289 274 182 364 226"/>
      </g>
    </g>
  </svg>
  <div class="startup-recovery" hidden>
    <p role="alert">Grapleton could not finish opening. Try again.</p>
    <button type="button" id="startup-retry">Try again</button>
  </div>
</div>`;

// The watchdog remains independent of the module bundle and its dependencies.
export const startupBootstrap = `(() => {
  const fail = () => {
    document.querySelector('.startup-glass')?.removeAttribute('style');
    const recovery = document.querySelector('.startup-recovery');
    if (recovery) recovery.hidden = false;
  };
  window.grapletonStartup = { timer: setTimeout(fail, 8000), fail };
  document.getElementById('startup-retry').addEventListener('click', () => location.reload());
})();`;

export async function finishStartup(releaseSplash, restoreWindow) {
  const overlay = document.getElementById('native-startup');
  if (!overlay) return;
  clearTimeout(window.grapletonStartup?.timer);
  document.querySelector('.startup-recovery').hidden = true;
  const artwork = new Image();
  artwork.src = './assets/grapleton-v4-512.png';
  await artwork.decode().catch(() => {});
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  // Keep the glass still if native insets change while the ready app is revealed.
  const glass = overlay.querySelector('.startup-glass');
  const bounds = glass.getBoundingClientRect();
  Object.assign(glass.style, { position: 'fixed', left: bounds.left + 'px', top: bounds.top + 'px',
    width: bounds.width + 'px', height: bounds.height + 'px' });
  overlay.classList.add('startup-revealing');
  try {
    await releaseSplash?.();
  } catch (error) {
    console.warn('Could not finish the native splash handoff', error);
  }
  // Reveal the already-rendered app underneath the purple surface before fading it.
  document.documentElement.classList.remove('native-starting');
  await new Promise(resolve => requestAnimationFrame(resolve));
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !overlay.animate) {
    overlay.remove();
  } else {
    const transition = overlay.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 260,
      easing: 'cubic-bezier(.2,.7,.3,1)',
      fill: 'forwards',
    });
    // Cleanup also runs if the browser interrupts the animation.
    const cleanup = setTimeout(() => overlay.remove(), 320);
    await transition.finished.catch(() => {});
    clearTimeout(cleanup);
    overlay.remove();
  }
  // Native backing stays purple until a cream app frame is already on screen.
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    await restoreWindow?.();
  } catch (error) {
    console.warn('Could not restore the app window background', error);
  }
}

export function failStartup(error) {
  clearTimeout(window.grapletonStartup?.timer);
  window.grapletonStartup?.fail();
  console.error('Grapleton startup failed', error);
}
