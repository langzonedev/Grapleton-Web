const icon = paths => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';

const icons = {
  cellar: icon('<path d="M5 21V8a7 7 0 0 1 14 0v13H5Z"/><path d="M9 21v-7a3 3 0 0 1 6 0v7M5 8h14M12 1v7"/>'),
  rack: icon('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18M12 3v18"/><circle cx="7.5" cy="7.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>'),
  collection: icon('<path d="M8 3h8l1 6a5 5 0 0 1-10 0l1-6ZM12 14v7M8 21h8M7 8h10"/>'),
  settings: icon('<rect x="4" y="3" width="16" height="5" rx="2.5"/><path d="M12 8v3c-6 0-6 4 0 4s6 4 0 4l-2 2M7 5.5h10"/>'),
};

const routes = [['cellar', 'My Cellar'], ['rack', 'Rack'], ['collection', 'Collection'], ['settings', 'Settings']];
let selectionPopover;
let selectedSource;
let sequence = 0;
const enhanced = new WeakMap();
const motions = new WeakMap();
const closing = new WeakMap();
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function playMotion(element, frames, duration) {
  motions.get(element)?.cancel();
  if (reducedMotion() || !element.animate) return null;
  const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
  motions.set(element, animation);
  return animation;
}

export function animateDialog(dialog) {
  const pending = closing.get(dialog);
  if (pending) {
    pending.cancelled = true;
    closing.delete(dialog);
  }
  dialog.classList.remove('native-closing');
  const popover = dialog.classList.contains('native-choice-popover');
  const running = motions.get(dialog)?.playState === 'running';
  const current = running ? getComputedStyle(dialog) : null;
  playMotion(dialog, [
    { opacity: current?.opacity ?? 0, transform: current?.transform ?? (popover ? 'translateY(-5px) scale(.98)' : 'translateY(32px)') },
    { opacity: 1, transform: 'translateY(0) scale(1)' },
  ], 220);
}

export function closeDialog(dialog) {
  if (!dialog?.open) return Promise.resolve();
  if (closing.has(dialog)) return closing.get(dialog).promise;
  const state = { cancelled: false };
  closing.set(dialog, state);
  dialog.classList.add('native-closing');
  const start = getComputedStyle(dialog);
  const animation = playMotion(dialog, [
    { opacity: start.opacity, transform: start.transform },
    { opacity: 0, transform: dialog.classList.contains('native-choice-popover') ? 'translateY(-4px) scale(.98)' : 'translateY(26px)' },
  ], 180);
  state.promise = (animation?.finished.catch(() => {}) ?? Promise.resolve()).then(() => {
    if (state.cancelled || closing.get(dialog) !== state) return;
    closing.delete(dialog);
    if (dialog.open) dialog.close();
  });
  return state.promise;
}

function fieldTitle(select) {
  if (select.dataset.nativeLabel) return select.dataset.nativeLabel;
  if (select.getAttribute('aria-label')) return select.getAttribute('aria-label');
  const label = select.labels?.[0];
  if (!label) return 'Choose an option';
  return [...label.childNodes].filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent).join(' ').trim() || 'Choose an option';
}

function syncSelect(select) {
  const trigger = enhanced.get(select);
  if (!trigger) return;
  const label = fieldTitle(select);
  const value = select.selectedOptions[0]?.textContent || 'Choose…';
  const text = trigger.querySelector('.native-select-value');
  if (text.textContent !== value) text.textContent = value;
  trigger.setAttribute('aria-label', label + ', ' + value);
  trigger.disabled = select.disabled;
  trigger.classList.toggle('native-select-placeholder', !select.value);
}

function enhanceSelect(select) {
  if (select.multiple || enhanced.has(select)) return;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'native-select-trigger';
  trigger.innerHTML = '<span class="native-select-value"></span>' + icon('<path d="m8 10 4 4 4-4"/>');
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  select.classList.add('native-select-source');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;
  select.after(trigger);
  enhanced.set(select, trigger);
  trigger.addEventListener('click', () => openSelect(select));
  select.labels?.[0]?.addEventListener('click', event => {
    if (event.target.closest('button,input,textarea,select,a')) return;
    event.preventDefault();
    openSelect(select);
  });
  select.addEventListener('change', () => syncSelect(select));
  select.addEventListener('invalid', event => {
    event.preventDefault();
    trigger.setAttribute('aria-invalid', 'true');
    trigger.focus();
    openSelect(select);
  });
  syncSelect(select);
}

export function openSelect(select) {
  if (select.disabled || !select.isConnected) return;
  if (selectionPopover?.open) selectionPopover.close();
  enhanceSelect(select);
  const trigger = enhanced.get(select);
  if (!trigger) return;
  const sourceId = select.id;
  const sourceName = select.name;
  const sourceForm = select.form;
  syncSelect(select);
  const popover = document.createElement('dialog');
  const id = 'native-choice-' + ++sequence;
  popover.className = 'native-choice-popover';
  popover.setAttribute('aria-labelledby', id);
  popover.innerHTML = '<div class="native-choice-top"><h2 id="' + id + '"></h2>' +
    '<button type="button" class="quiet native-choice-close" aria-label="Close selection">' + icon('<path d="m7 7 10 10M17 7 7 17"/>') + '</button></div>' +
    '<label class="native-choice-search">Find an option<input type="search" autocomplete="off" placeholder="Search options"></label>' +
    '<div class="native-choice-options"></div><p class="native-choice-status" role="status"></p>';
  popover.querySelector('h2').textContent = fieldTitle(select);
  const search = popover.querySelector('input');
  const list = popover.querySelector('.native-choice-options');
  const status = popover.querySelector('.native-choice-status');
  popover.querySelector('.native-choice-search').hidden = select.options.length <= 8;
  const viewport = window.visualViewport;
  const positionPopover = () => {
    if (!popover.open || !trigger.isConnected) return;
    const bounds = trigger.getBoundingClientRect();
    const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
    const topEdge = (viewport?.offsetTop ?? 0) + 8;
    const rightEdge = leftEdge + (viewport?.width ?? innerWidth) - 16;
    const bottomEdge = topEdge + (viewport?.height ?? innerHeight) - 16;
    const width = Math.min(Math.max(bounds.width, 240), rightEdge - leftEdge);
    const below = Math.max(0, bottomEdge - bounds.bottom - 6);
    const above = Math.max(0, bounds.top - topEdge - 6);
    const openBelow = below >= Math.min(240, above);
    const available = Math.min(420, Math.max(80, openBelow ? below : above), bottomEdge - topEdge);
    popover.style.width = width + 'px';
    popover.style.maxHeight = available + 'px';
    popover.style.left = Math.max(leftEdge, Math.min(bounds.left, rightEdge - width)) + 'px';
    const height = popover.getBoundingClientRect().height;
    popover.style.top = Math.max(topEdge, Math.min(openBelow ? bounds.bottom + 6 : bounds.top - height - 6, bottomEdge - height)) + 'px';
    popover.style.transformOrigin = openBelow ? 'top left' : 'bottom left';
  };
  const normalise = value => value.toLocaleLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const renderOptions = () => {
    const term = normalise(search.value.trim());
    const options = [...select.options].filter(option => !option.hidden && normalise(option.textContent).includes(term));
    list.replaceChildren();
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'native-choice-option';
      button.disabled = option.disabled || option.closest('optgroup')?.disabled || false;
      button.setAttribute('aria-pressed', String(option.selected));
      const text = document.createElement('span');
      text.textContent = option.textContent;
      button.append(text);
      button.insertAdjacentHTML('beforeend', icon('<path d="m5 12 4 4L19 6"/>'));
      button.addEventListener('click', () => {
        select.value = option.value;
        trigger.removeAttribute('aria-invalid');
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        syncSelect(select);
        window.grapletonNative?.selectionFeedback?.();
        closeDialog(popover);
      });
      list.append(button);
    }
    status.textContent = options.length ? '' : 'No matching options. Try another search.';
    positionPopover();
  };
  search.addEventListener('input', renderOptions);
  popover.querySelector('.native-choice-close').addEventListener('click', () => closeDialog(popover));
  popover.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog(popover);
  });
  popover.addEventListener('click', event => {
    if (event.target !== popover) return;
    const bounds = popover.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(popover);
  });
  popover.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const options = [...list.querySelectorAll('button:not(:disabled)')];
    if (!options.length) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const current = options.indexOf(document.activeElement);
    const next = current === -1 && direction === -1 ? options.length - 1
      : (current + direction + options.length) % options.length;
    options[next].focus();
  });
  popover.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    if (selectionPopover === popover) {
      selectionPopover = undefined;
      selectedSource = undefined;
    }
    window.removeEventListener('resize', positionPopover);
    viewport?.removeEventListener('resize', positionPopover);
    viewport?.removeEventListener('scroll', positionPopover);
    popover.remove();
    requestAnimationFrame(() => {
      const replacement = sourceId ? document.getElementById(sourceId)
        : sourceForm?.isConnected && sourceName ? sourceForm.elements.namedItem(sourceName) : undefined;
      const target = trigger.isConnected ? trigger : enhanced.get(replacement);
      target?.focus({ preventScroll: true });
    });
  }, { once: true });
  document.body.append(popover);
  selectionPopover = popover;
  selectedSource = select;
  renderOptions();
  trigger.setAttribute('aria-expanded', 'true');
  popover.showModal();
  positionPopover();
  window.addEventListener('resize', positionPopover);
  viewport?.addEventListener('resize', positionPopover);
  viewport?.addEventListener('scroll', positionPopover);
  animateDialog(popover);
  popover.querySelector('.native-choice-close').focus({ preventScroll: true });
}

export function setupNativeUI() {
  if (document.body.classList.contains('native-app')) return window.grapletonNativeUI;
  document.body.classList.add('native-app');
  document.querySelector('.brand')?.setAttribute('href', '#cellar');
  const title = document.createElement('span');
  title.className = 'native-page-title';
  document.querySelector('.brand')?.after(title);
  const nav = document.createElement('nav');
  nav.className = 'native-bottom-nav';
  nav.setAttribute('aria-label', 'Main navigation');
  nav.innerHTML = routes.map(([route, label]) => '<a href="#' + route + '" data-native-route="' + route + '">' +
    '<span class="native-nav-icon">' + icons[route] + '</span><span>' + label + '</span></a>').join('');
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) window.grapletonNative?.selectionFeedback?.();
  });
  document.body.append(nav);
  const renderNavigation = route => {
    const current = routes.find(([name]) => name === route) ?? routes[0];
    title.textContent = current[1];
    document.body.dataset.nativeRoute = current[0];
    for (const link of nav.querySelectorAll('a')) {
      if (link.dataset.nativeRoute === current[0]) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
    const hero = document.querySelector('.hero');
    if (hero) hero.hidden = current[0] !== 'cellar';
  };
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const select = record.target instanceof Element ? record.target.closest('select') : record.target.parentElement?.closest('select');
      if (select) syncSelect(select);
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('select')) enhanceSelect(node);
        node.querySelectorAll('select').forEach(enhanceSelect);
      }
    }
    if (selectionPopover?.open && !selectedSource?.isConnected) closeDialog(selectionPopover);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label'] });
  document.querySelectorAll('select').forEach(enhanceSelect);
  let pressedSlot;
  const releaseSlot = () => {
    if (!pressedSlot) return;
    playMotion(pressedSlot, [{ transform: getComputedStyle(pressedSlot).transform }, { transform: 'scale(1)' }], 180);
    pressedSlot = undefined;
  };
  document.addEventListener('pointerdown', event => {
    releaseSlot();
    const slot = event.target.closest('.slot');
    if (slot && !slot.disabled) {
      pressedSlot = slot;
      playMotion(slot, [{ transform: 'scale(1)' }, { transform: 'scale(.94)' }], 90)?.effect.updateTiming({ fill: 'forwards' });
    }
  });
  document.addEventListener('pointerup', releaseSlot);
  document.addEventListener('pointercancel', releaseSlot);
  window.addEventListener('blur', releaseSlot);
  document.addEventListener('click', event => {
    const slot = event.target.closest('.slot');
    if (!slot) return;
    document.querySelector('.slot.native-selected')?.classList.remove('native-selected');
    slot.classList.add('native-selected');
    playMotion(slot, [{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], 200);
  });
  document.querySelector('#dialog')?.addEventListener('close', () => {
    document.querySelector('.slot.native-selected')?.classList.remove('native-selected');
  });
  window.grapletonNativeUI = { renderNavigation, openSelect, animateDialog, closeDialog };
  renderNavigation(location.hash.slice(1) || 'cellar');
  return window.grapletonNativeUI;
}
