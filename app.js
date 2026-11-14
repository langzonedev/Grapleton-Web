import { readCellar, saveCellar } from './store.js';

const $ = (selector, root = document) => root.querySelector(selector);
const view = $('#view');
const dialog = $('#dialog');
const styles = { Red: 'red', White: 'white', 'Rosé': 'rose', Sparkling: 'sparkling', Other: 'other' };
const escape = (value = '') => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const slotName = key => {
  const [row, column] = key.split(':').map(Number);
  return String.fromCharCode(64 + row) + column;
};
const slotKeys = () => Array.from({ length: cellar.rows * cellar.columns }, (_, index) =>
  (Math.floor(index / cellar.columns) + 1) + ':' + (index % cellar.columns + 1));
const entries = () => slotKeys().filter(key => cellar.bottles[key]);
const freeSlots = () => slotKeys().filter(key => !cellar.bottles[key]);
const imageURLs = new Map();
let cellar;
let route;
let highlighted;
let query = '';
let focusReturn;
let dialogContent = 0;
let saving = false;
let toastTimer;

function photoMarkup(bottle) {
  if (!bottle.photo) return '<img class="illustration" src="./assets/bottle-' +
    (styles[bottle.style] ?? 'other') + '.svg" alt="">';
  if (!imageURLs.has(bottle.photo)) imageURLs.set(bottle.photo, URL.createObjectURL(bottle.photo));
  return '<img class="bottle-photo" src="' + imageURLs.get(bottle.photo) + '" alt="' +
    escape('Bottle photo of ' + bottle.name) + '">';
}

function releaseUnusedImages() {
  const active = new Set(Object.values(cellar.bottles).map(bottle => bottle.photo));
  for (const [photo, url] of imageURLs) {
    if (active.has(photo)) continue;
    URL.revokeObjectURL(url);
    imageURLs.delete(photo);
  }
}

function notify(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3400);
}

function searchMatches() {
  const normalise = value => value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const words = normalise(query).trim().split(/\s+/).filter(Boolean);
  return entries().filter(key => {
    const bottle = cellar.bottles[key];
    const haystack = normalise([bottle.name, bottle.vintage, bottle.variety, bottle.style, bottle.notes, slotName(key)].join(' '));
    return words.every(word => haystack.includes(word));
  });
}

function updateSearch() {
  const matches = searchMatches();
  const searching = query.trim().length > 0;
  const results = $('#results');
  const show = searching || route === 'collection';
  results.hidden = !show || !matches.length;
  results.innerHTML = show ? matches.map(key => {
    const bottle = cellar.bottles[key];
    const action = route === 'rack' ? 'locate' : 'slot';
    return '<li><button class="result" data-action="' + action + '" data-key="' + key + '">' +
      '<span class="result-art">' + photoMarkup(bottle) + '</span><span><strong>' + escape(bottle.name) +
      '</strong><small>' + escape([bottle.vintage, bottle.variety || bottle.style].filter(Boolean).join(' · ')) +
      '</small></span><span class="result-slot">' + slotName(key) + '</span></button></li>';
  }).join('') : '';
  $('#search-status').textContent = searching
    ? matches.length ? matches.length + (matches.length === 1 ? ' matching bottle' : ' matching bottles') : 'No bottles match that search.'
    : route === 'collection' && !matches.length ? 'Your collection is empty. Add a bottle to get started.' : '';
  const matchingKeys = new Set(matches);
  view.querySelectorAll('.slot').forEach(tile => {
    tile.classList.toggle('matching', searching && matchingKeys.has(tile.dataset.key));
    tile.classList.toggle('dim', searching && !matchingKeys.has(tile.dataset.key));
  });
}

function rackMarkup() {
  const slots = slotKeys().map(key => {
    const bottle = cellar.bottles[key];
    return '<button data-action="slot" data-key="' + key + '" class="slot ' +
      (bottle ? 'occupied ' + styles[bottle.style] : 'empty') + (key === highlighted ? ' located' : '') +
      '" aria-label="' + escape(slotName(key) + (bottle ? ' · ' + bottle.name : ' · Empty slot')) + '">' +
      '<span class="coordinate">' + slotName(key) + '</span>' +
      (bottle ? photoMarkup(bottle) : '<span class="plus" aria-hidden="true">+</span>') + '</button>';
  }).join('');
  return '<section class="rack-panel" aria-label="Bottle rack"><div class="panel-top"><div><h3>Main rack</h3>' +
    '<p>' + cellar.rows + ' rows × ' + cellar.columns + ' columns</p></div>' +
    '<button class="secondary" data-action="rack-settings">Edit rack</button></div>' +
    '<div class="rack-scroll"><div class="rack" style="--columns:' + cellar.columns + '">' + slots + '</div></div>' +
    '<div class="legend"><span><i class="legend-empty">+</i> Empty</span><span><i class="legend-full"></i> Occupied</span><span class="rack-hint" hidden>Scroll sideways for more slots</span></div></section>';
}

const rackObserver = new ResizeObserver(([{ target }]) => {
  const hint = $('.rack-hint');
  if (hint && target.isConnected) hint.hidden = target.scrollWidth <= target.clientWidth;
});

function render() {
  rackObserver.disconnect();
  const requested = location.hash.slice(1);
  route = ['collection', 'settings'].includes(requested) ? requested : 'rack';
  document.querySelectorAll('#nav a').forEach(link => {
    if (link.hash === '#' + route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const count = Object.keys(cellar.bottles).length;
  $('#hero-stats').innerHTML = '<span><b>' + count + '</b> ' + (count === 1 ? 'bottle' : 'bottles') +
    '</span><span><b>' + (cellar.rows * cellar.columns - count) + '</b> open slots</span>';
  if (route === 'settings') {
    view.innerHTML = '<section class="settings"><h2>Cellar settings</h2><div class="rack-panel settings-panel">' +
      '<div><h3>Rack layout</h3><p>' + cellar.rows + ' rows × ' + cellar.columns + ' columns</p></div>' +
      '<button class="secondary" data-action="rack-settings">Edit rack</button></div>' +
      '<div class="rack-panel"><h3>Local storage</h3><p>Your bottles and photos stay in this browser on this device. Clearing site data removes your cellar.</p>' +
      '<p>To install Grapleton, use your browser’s install option or Add to Home Screen from the Share menu on iPhone.</p></div></section>';
    return;
  }
  view.innerHTML = '<section><div class="section-top"><div><h2>' + (route === 'rack' ? 'Your rack' : 'Collection') +
    '</h2><p>' + (route === 'rack' ? 'Select a position to add or view a bottle.' : 'Find and view the bottles in your cellar.') +
    '</p></div><button class="primary section-add" data-action="add">＋ Add bottle</button></div>' +
    '<div class="search-box"><label for="search">Find a bottle</label><input type="search" id="search" autocomplete="off" ' +
    'placeholder="e.g. 2010 Shiraz"><p id="search-status" role="status"></p><ul id="results"></ul></div>' +
    (route === 'rack' ? rackMarkup() : '') + '</section>';
  $('#search').value = query;
  $('#search').addEventListener('input', event => {
    query = event.target.value;
    highlighted = undefined;
    $('.located', view)?.classList.remove('located');
    updateSearch();
  });
  updateSearch();
  const rackScroll = $('.rack-scroll');
  if (rackScroll) rackObserver.observe(rackScroll);
}

function locate(key) {
  highlighted = key;
  if (route !== 'rack') {
    location.hash = 'rack';
    return;
  }
  focusSlot(key, true);
}

function focusSlot(key, scroll = false) {
  const tile = view.querySelector('.slot[data-key="' + key + '"]');
  if (!tile) return false;
  if (scroll) {
    $('.located', view)?.classList.remove('located');
    tile.classList.add('located');
    tile.scrollIntoView({ block: 'center', inline: 'nearest' });
  }
  tile.focus({ preventScroll: true });
  return true;
}

function openDialog(title, content) {
  dialogContent++;
  if (!dialog.open) focusReturn = document.activeElement;
  dialog.scrollTop = 0;
  dialog.innerHTML = '<div class="dialog-head"><h2 id="dialog-title">' + escape(title) +
    '</h2><button class="quiet close" aria-label="Close" data-action="close">×</button></div>' + content;
  dialog.setAttribute('aria-labelledby', 'dialog-title');
  if (!dialog.open) dialog.showModal();
  else $('.close', dialog).focus();
}

dialog.addEventListener('close', () => {
  if (!dialog.open && document.activeElement === document.body && focusReturn?.isConnected) focusReturn.focus();
});
dialog.addEventListener('cancel', event => {
  if (saving) event.preventDefault();
});

function showBottle(key) {
  const bottle = cellar.bottles[key];
  const extra = [
    ['Purchased', bottle.purchased], ['Purchase reason', bottle.reason],
    ['Drink by', bottle.drinkBy], ['Food pairings', bottle.pairings], ['Notes', bottle.notes],
  ].filter(([, value]) => value);
  const lookup = new URL('https://www.google.com/search');
  lookup.searchParams.set('q', [bottle.name, bottle.vintage, 'wine'].filter(Boolean).join(' '));
  openDialog(bottle.name, '<div class="detail-top"><div class="detail-art ' + styles[bottle.style] + '">' +
    photoMarkup(bottle) + '</div><div><span class="position">Slot ' + slotName(key) + '</span><p>' +
    escape([bottle.vintage, bottle.variety || bottle.style].filter(Boolean).join(' · ')) + '</p>' +
    (bottle.drinkBy ? '<p>Drink by <strong>' + escape(bottle.drinkBy) + '</strong></p>' : '') +
    '<a href="' + escape(lookup.href) + '" rel="noopener noreferrer" target="_blank">Look up wine ↗</a></div></div>' +
    (extra.length ? '<details class="extra"><summary>Purchase, pairings &amp; notes</summary><dl>' +
      extra.map(([label, value]) => '<dt>' + label + '</dt><dd>' + escape(value) + '</dd>').join('') +
      '</dl></details>' : '') +
    '<div class="dialog-actions"><button class="quiet danger" data-action="remove" data-key="' + key + '">Remove</button>' +
    (route === 'collection' ? '<button class="secondary" data-action="locate" data-key="' + key + '">Show in rack</button>' : '') +
    '<button class="primary" data-action="edit" data-key="' + key + '">Edit bottle</button></div>');
}

async function compressPhoto(file) {
  if (file.size > 30 * 1024 * 1024) throw new Error('Choose a photo smaller than 30 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#f8f4ee';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .85));
    if (!blob) throw new Error('This photo could not be saved.');
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function commit(next, button, error, message, key) {
  if (saving) return;
  saving = true;
  button.disabled = true;
  error.textContent = '';
  try {
    cellar = await saveCellar(next, cellar.revision);
    dialog.close();
    render();
    releaseUnusedImages();
    if (!key || !focusSlot(key)) $('#search')?.focus();
    if (!document.activeElement || document.activeElement === document.body) $('#main').focus();
    notify(message);
  } catch (failure) {
    error.textContent = failure.message;
    button.disabled = false;
  } finally {
    saving = false;
  }
}

function editBottle(key) {
  const existing = cellar.bottles[key];
  const available = freeSlots();
  if (!existing && !available.length) {
    openDialog('Your rack is full', '<p>Make room by extending your rack or removing a bottle.</p>' +
      '<div class="dialog-actions"><button class="primary" data-action="rack-settings">Edit rack</button></div>');
    return;
  }
  openDialog(existing ? 'Edit bottle' : 'Add bottle', '');
  const generation = dialogContent;
  dialog.append($('#bottle-form').content.cloneNode(true));
  const form = $('#edit-form');
  const select = form.elements.slot;
  if (existing) $('[data-action="cancel-edit"]', form).dataset.key = key;
  for (const position of slotKeys().filter(position => position === key || available.includes(position))) {
    select.add(new Option(slotName(position), position, false, position === key));
  }
  for (const field of ['name', 'style', 'vintage', 'variety', 'purchased', 'drinkBy', 'reason', 'pairings', 'notes']) {
    if (existing?.[field]) form.elements[field].value = existing[field];
  }
  let photo = existing?.photo ?? null;
  let photoURL;
  const status = $('#photo-status');
  const preview = $('#photo-preview');
  const submit = $('button[type="submit"]', form);
  const clear = $('[data-action="clear-photo"]', form);
  const updatePreview = () => {
    if (photoURL) URL.revokeObjectURL(photoURL);
    photoURL = photo ? URL.createObjectURL(photo) : null;
    preview.innerHTML = photoURL ? '<img src="' + photoURL + '" alt="Selected bottle photo">' :
      '<img class="illustration" src="./assets/bottle-' + styles[form.elements.style.value] + '.svg" alt="">';
    clear.hidden = !photo;
  };
  updatePreview();
  dialog.addEventListener('close', () => { if (photoURL) URL.revokeObjectURL(photoURL); }, { once: true });
  form.elements.style.addEventListener('change', updatePreview);
  clear.addEventListener('click', () => {
    photo = null;
    updatePreview();
    status.textContent = 'Photo removed.';
  });
  for (const id of ['camera', 'library']) {
    const input = $('#' + id, form);
    input.addEventListener('change', async () => {
      const [file] = input.files;
      input.value = '';
      if (!file) return;
      submit.disabled = true;
      for (const control of document.querySelectorAll('.photo-actions button')) control.disabled = true;
      status.textContent = 'Preparing photo…';
      try {
        const prepared = await compressPhoto(file);
        if (!dialog.open || generation !== dialogContent) return;
        photo = prepared;
        updatePreview();
        status.textContent = 'Photo ready.';
      } catch (error) {
        status.textContent = error.message === 'Choose a photo smaller than 30 MB.' ? error.message :
          'This photo could not be opened. Try a JPEG or PNG.';
      } finally {
        submit.disabled = false;
        for (const control of form.querySelectorAll('.photo-actions button')) control.disabled = false;
      }
    });
  }
  form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(form)].map(([name, value]) => [name, value.trim()]));
    if (!values.name) {
      form.elements.name.setCustomValidity('Enter a wine name.');
      form.elements.name.reportValidity();
      return;
    }
    const { slot, ...details } = values;
    const bottles = { ...cellar.bottles };
    if (existing) delete bottles[key];
    bottles[slot] = { ...details, photo };
    commit({ ...cellar, bottles }, submit, $('.error', form), 'Bottle saved in ' + slotName(slot) + '.', slot);
  });
  $('.close', dialog).focus();
}

function editRack() {
  openDialog('Edit rack', '<form id="rack-form"><p>Set the number of rows and columns in your physical rack.</p>' +
    '<div class="fields"><label>Rows<input name="rows" type="number" min="1" max="26" required value="' + cellar.rows +
    '"></label><label>Columns<input name="columns" type="number" min="1" max="24" required value="' + cellar.columns +
    '"></label></div><p class="error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary" ' +
    'data-action="close">Cancel</button><button class="primary">Save rack</button></div></form>');
  const form = $('#rack-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const rows = form.elements.rows.valueAsNumber;
    const columns = form.elements.columns.valueAsNumber;
    const outside = entries().filter(key => {
      const [row, column] = key.split(':').map(Number);
      return row > rows || column > columns;
    });
    const error = $('.error', form);
    if (outside.length) {
      error.textContent = 'Move or remove bottles in ' + outside.map(slotName).join(', ') + ' before shrinking the rack.';
      return;
    }
    commit({ ...cellar, rows, columns }, $('button.primary', form), error, 'Rack updated.');
  });
  form.elements.rows.focus();
}

function removeBottle(key) {
  openDialog('Remove bottle?', '<p>Remove <strong>' + escape(cellar.bottles[key].name) + '</strong> from ' +
    slotName(key) + '? Its saved details and photo will be deleted.</p><p class="error" role="alert"></p>' +
    '<div class="dialog-actions"><button class="secondary" data-action="slot" data-key="' + key +
    '">Keep bottle</button><button class="primary" data-action="confirm-remove" data-key="' + key + '">Remove bottle</button></div>');
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control || !cellar || saving) return;
  const { action, key } = control.dataset;
  switch (action) {
    case 'add': editBottle(); break;
    case 'rack-settings': editRack(); break;
    case 'slot': if (cellar.bottles[key]) showBottle(key); else editBottle(key); break;
    case 'locate': if (dialog.open) dialog.close(); locate(key); break;
    case 'edit': editBottle(key); break;
    case 'remove': removeBottle(key); break;
    case 'cancel-edit': if (cellar.bottles[key]) showBottle(key); else dialog.close(); break;
    case 'close': dialog.close(); break;
    case 'camera':
    case 'library': $('#' + action, dialog).click(); break;
    case 'confirm-remove': {
      const bottles = { ...cellar.bottles };
      delete bottles[key];
      commit({ ...cellar, bottles }, control, $('.error', dialog), 'Bottle removed.', key);
      break;
    }
  }
});

const menu = $('#menu-toggle');
function toggleMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  $('#nav').classList.toggle('open', open);
}
menu.addEventListener('click', () => toggleMenu(menu.getAttribute('aria-expanded') === 'false'));
$('#nav').addEventListener('click', event => {
  if (event.target.closest('a')) {
    toggleMenu(false);
    $('#main').focus();
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
    toggleMenu(false);
    menu.focus();
  }
});

async function refresh() {
  const next = await readCellar();
  if (saving || dialog.open || next.revision <= cellar.revision) return;
  const searchFocused = document.activeElement === $('#search');
  cellar = next;
  render();
  releaseUnusedImages();
  if (searchFocused) $('#search')?.focus();
}

try {
  cellar = await readCellar();
  render();
  window.addEventListener('hashchange', () => {
    render();
    if (route === 'rack' && highlighted) focusSlot(highlighted, true);
  });
  window.addEventListener('focus', () => refresh().catch(console.warn));
  dialog.addEventListener('close', () => refresh().catch(console.warn));
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(console.warn);
} catch {
  view.innerHTML = '<p role="alert">Grapleton could not open browser storage. Enable site storage and reload to use your cellar.</p>';
  document.querySelectorAll('[data-action]').forEach(button => { button.disabled = true; });
}
