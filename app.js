import { readCellar, saveCellar, readCameraDraft, saveCameraDraft } from './store.js';
import { openPhotoViewer } from './photo-viewer.js';

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
const varieties = [
  'Albariño', 'Barbera', 'Cabernet Franc', 'Cabernet Sauvignon', 'Carménère', 'Chardonnay',
  'Chenin Blanc', 'Dolcetto', 'Fiano', 'Gamay', 'Gewürztraminer', 'Grenache', 'Grüner Veltliner',
  'Malbec', 'Marsanne', 'Merlot', 'Montepulciano', 'Moscato', 'Mourvèdre', 'Nebbiolo',
  "Nero d’Avola", 'Petit Verdot', 'Pinot Blanc', 'Pinot Gris / Grigio', 'Pinot Meunier',
  'Pinot Noir', 'Riesling', 'Roussanne', 'Sangiovese', 'Sauvignon Blanc', 'Sémillon',
  'Shiraz / Syrah', 'Tempranillo', 'Touriga Nacional', 'Trebbiano', 'Verdelho', 'Vermentino',
  'Viognier', 'Zinfandel / Primitivo', 'Blend', 'Other',
];
const currentRack = () => cellar.racks.find(rack => rack.id === activeRackId) ?? cellar.racks[0];
const slotKeys = rack => Array.from({ length: rack.rows * rack.columns }, (_, index) =>
  (Math.floor(index / rack.columns) + 1) + ':' + (index % rack.columns + 1));
const entries = rack => slotKeys(rack).filter(key => rack.bottles[key]);
const freeSlots = rack => slotKeys(rack).filter(key => !rack.bottles[key]);
const replaceRack = (racks, updated) => racks.map(rack => rack.id === updated.id ? updated : rack);
const imageURLs = new Map();
let cellar;
let activeRackId;
let route;
let highlighted;
let query = '';
let focusReturn;
let dialogContent = 0;
let saving = false;
let toastTimer;
let recoveredCameraDraft;
const rackWindow = { rackId: null, page: 0, columns: 6, rows: 4, reveal: null, anchor: '1:1' };

function photoMarkup(bottle) {
  if (!bottle.photo) return '<img class="illustration" src="./assets/bottle-' +
    (styles[bottle.style] ?? 'other') + '.svg" alt="">';
  if (!imageURLs.has(bottle.photo)) imageURLs.set(bottle.photo, URL.createObjectURL(bottle.photo));
  return '<img class="bottle-photo" src="' + imageURLs.get(bottle.photo) + '" alt="' +
    escape('Bottle photo of ' + bottle.name) + '">';
}

function releaseUnusedImages() {
  const active = new Set(cellar.racks.flatMap(rack => Object.values(rack.bottles).map(bottle => bottle.photo)));
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
  return cellar.racks.flatMap(rack => entries(rack).filter(key => {
    const bottle = rack.bottles[key];
    const haystack = normalise([bottle.name, bottle.vintage, bottle.variety, bottle.style, bottle.notes, rack.name, slotName(key)].join(' '));
    return words.every(word => haystack.includes(word));
  }).map(key => ({ rack, key, bottle: rack.bottles[key] })));
}

function updateSearch() {
  const matches = searchMatches();
  const searching = query.trim().length > 0;
  const results = $('#results');
  const show = searching || route === 'collection';
  results.hidden = !show || !matches.length;
  results.innerHTML = show ? matches.map(({ rack, key, bottle }) => {
    const action = route === 'rack' ? 'locate' : 'slot';
    return '<li><button class="result" data-action="' + action + '" data-rack="' + rack.id + '" data-key="' + key + '">' +
      '<span class="result-art">' + photoMarkup(bottle) + '</span><span><strong>' + escape(bottle.name) +
      '</strong><small>' + escape([bottle.vintage, bottle.variety || bottle.style].filter(Boolean).join(' · ')) +
      '</small><small>' + escape(rack.name) + '</small></span><span class="result-slot">' + slotName(key) + '</span></button></li>';
  }).join('') : '';
  $('#search-status').textContent = searching
    ? matches.length ? matches.length + (matches.length === 1 ? ' matching bottle' : ' matching bottles') : 'No bottles match that search.'
    : route === 'collection' && !matches.length ? 'Your collection is empty. Add a bottle to get started.' : '';
  const matchingKeys = new Set(matches.filter(({ rack }) => rack.id === currentRack().id).map(({ key }) => key));
  view.querySelectorAll('.slot').forEach(tile => {
    tile.classList.toggle('matching', searching && matchingKeys.has(tile.dataset.key));
    tile.classList.toggle('dim', searching && !matchingKeys.has(tile.dataset.key));
  });
}

function nativeRackSection(rack) {
  if (rackWindow.rackId !== rack.id) {
    rackWindow.rackId = rack.id;
    rackWindow.page = 0;
  }
  const columns = Math.min(rack.columns, rackWindow.columns);
  const rows = Math.min(rack.rows, rackWindow.rows);
  const columnPages = Math.ceil(rack.columns / columns);
  const pages = columnPages * Math.ceil(rack.rows / rows);
  if (rackWindow.reveal) {
    const [row, column] = rackWindow.reveal.split(':').map(Number);
    rackWindow.page = Math.floor((row - 1) / rows) * columnPages + Math.floor((column - 1) / columns);
    rackWindow.reveal = null;
  }
  rackWindow.page = Math.max(0, Math.min(pages - 1, rackWindow.page));
  const firstRow = Math.floor(rackWindow.page / columnPages) * rows + 1;
  const firstColumn = (rackWindow.page % columnPages) * columns + 1;
  const lastRow = Math.min(rack.rows, firstRow + rows - 1);
  const lastColumn = Math.min(rack.columns, firstColumn + columns - 1);
  rackWindow.anchor = firstRow + ':' + firstColumn;
  return { firstRow, firstColumn, lastRow, lastColumn, pages };
}

function rackMarkup() {
  const rack = currentRack();
  const section = window.grapletonNative ? nativeRackSection(rack) : null;
  const visibleKeys = slotKeys(rack).filter(key => {
    if (!section) return true;
    const [row, column] = key.split(':').map(Number);
    return row >= section.firstRow && row <= section.lastRow && column >= section.firstColumn && column <= section.lastColumn;
  });
  const slots = visibleKeys.map(key => {
    const bottle = rack.bottles[key];
    return '<button data-action="slot" data-key="' + key + '" class="slot ' +
      (bottle ? 'occupied ' + styles[bottle.style] : 'empty') + (key === highlighted ? ' located' : '') +
      '" aria-label="' + escape(slotName(key) + (bottle ? ' · ' + bottle.name : ' · Empty slot')) + '">' +
      '<span class="coordinate">' + slotName(key) + '</span>' +
      (bottle ? photoMarkup(bottle) : '<span class="plus" aria-hidden="true">+</span>') + '</button>';
  }).join('');
  const columns = section ? section.lastColumn - section.firstColumn + 1 : rack.columns;
  const rows = section ? section.lastRow - section.firstRow + 1 : rack.rows;
  const pager = section && section.pages > 1 ? '<div class="rack-pager"><button class="quiet" data-action="rack-page" data-step="-1" aria-label="Previous rack section"' +
    (rackWindow.page === 0 ? ' disabled' : '') + '>‹</button><span role="status">Rows ' +
    String.fromCharCode(64 + section.firstRow) + '–' + String.fromCharCode(64 + section.lastRow) + ' · columns ' + section.firstColumn + '–' + section.lastColumn +
    '<small>Section ' + (rackWindow.page + 1) + ' of ' + section.pages + '</small></span>' +
    '<button class="quiet" data-action="rack-page" data-step="1" aria-label="Next rack section"' + (rackWindow.page === section.pages - 1 ? ' disabled' : '') + '>›</button></div>' : '';
  return '<section class="rack-panel" aria-label="Bottle rack"><div class="panel-top"><div><h3>' + escape(rack.name) + '</h3>' +
    '<p>' + rack.rows + ' rows × ' + rack.columns + ' columns</p></div>' +
    '<button class="secondary" data-action="rack-settings">Edit rack</button></div>' +
    '<div class="rack-scroll"><div class="rack" style="--columns:' + columns + ';--visible-columns:' + columns + ';--visible-rows:' + rows + '">' + slots + '</div></div>' +
    pager + (window.grapletonNative ? '' : '<div class="legend"><span><i class="legend-empty">+</i> Empty</span><span><i class="legend-full"></i> Occupied</span><span class="rack-hint" hidden>Scroll sideways for more slots</span></div>') + '</section>';
}

function updateNativeRack() {
  const panel = view.querySelector('[aria-label="Bottle rack"]');
  if (!panel) return;
  const focusedKey = document.activeElement?.closest('.slot')?.dataset.key;
  rackObserver.disconnect();
  panel.outerHTML = rackMarkup();
  rackObserver.observe($('.rack-scroll'));
  updateSearch();
  if (focusedKey) focusSlot(focusedKey);
}

const rackObserver = new ResizeObserver(([{ target }]) => {
  if (window.grapletonNative) {
    if (!target.isConnected || target.clientHeight < 48) return;
    const style = getComputedStyle(target);
    const width = target.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = target.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const rack = currentRack();
    const columns = Math.max(1, Math.min(rack.columns, Math.floor((width + 3) / 51)));
    const pagerHeight = $('.rack-pager')?.getBoundingClientRect().height ?? 0;
    const fullHeight = height + pagerHeight;
    const fullRows = Math.max(1, Math.min(rack.rows, Math.floor((fullHeight + 3) / 51)));
    const needsPager = columns < rack.columns || fullRows < rack.rows;
    const availableHeight = needsPager ? fullHeight - (pagerHeight || 48) : fullHeight;
    const rows = Math.max(1, Math.min(rack.rows, Math.floor((availableHeight + 3) / 51)));
    if (columns === rackWindow.columns && rows === rackWindow.rows) return;
    rackWindow.reveal = document.activeElement?.closest('.slot')?.dataset.key
      ?? (highlighted && target.querySelector('[data-key="' + highlighted + '"]') ? highlighted : rackWindow.anchor);
    rackWindow.columns = columns;
    rackWindow.rows = rows;
    updateNativeRack();
    return;
  }
  const hint = $('.rack-hint');
  if (hint && target.isConnected) hint.hidden = target.scrollWidth <= target.clientWidth;
});

function cellarOverview() {
  const cards = cellar.racks.map(rack => {
    const count = entries(rack).length;
    const capacity = rack.rows * rack.columns;
    const preview = slotKeys(rack).slice(0, 18).map(key =>
      '<i class="' + (rack.bottles[key] ? 'filled' : '') + '"></i>').join('');
    return '<button class="cellar-rack" data-action="open-rack" data-rack="' + rack.id + '">' +
      '<span class="rack-mini" aria-hidden="true">' + preview + '</span><span><strong>' + escape(rack.name) +
      '</strong><small>' + count + ' of ' + capacity + ' slots filled</small></span><span aria-hidden="true">›</span></button>';
  }).join('');
  return '<section class="native-overview"><div class="section-top"><h2>Your racks</h2>' +
    '<button class="secondary" data-action="new-rack">＋ Add rack</button></div><div class="cellar-racks">' + cards +
    '</div></section>';
}

function render() {
  rackObserver.disconnect();
  const requested = location.hash.slice(1);
  route = ['rack', 'collection', 'settings'].includes(requested) ? requested
    : window.grapletonNative ? 'cellar' : 'rack';
  if (window.grapletonNativeUI) window.grapletonNativeUI.renderNavigation(route);
  $('.hero').hidden = !!window.grapletonNative && route !== 'cellar';
  document.querySelectorAll('#nav a').forEach(link => {
    if (link.hash === '#' + route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const count = cellar.racks.reduce((total, rack) => total + Object.keys(rack.bottles).length, 0);
  const capacity = cellar.racks.reduce((total, rack) => total + rack.rows * rack.columns, 0);
  $('#hero-stats').innerHTML = '<span><b>' + count + '</b> ' + (count === 1 ? 'bottle' : 'bottles') +
    '</span><span><b>' + (capacity - count) + '</b> open slots</span>';
  if (route === 'cellar') {
    view.innerHTML = cellarOverview();
    return;
  }
  if (route === 'settings') {
    view.innerHTML = '<section class="settings"><h2>Cellar settings</h2>' + (window.grapletonNative ? '' : '<div class="rack-panel settings-panel">' +
      '<div><h3>Racks</h3>' + rackControls() + '</div>' +
      '<button class="secondary" data-action="rack-settings">Edit rack</button></div>') +
      '<div class="rack-panel"><h3>Local storage</h3><p>' + (window.grapletonNative
        ? 'Your bottles and photos stay on this device. Uninstalling Grapleton or clearing its app data removes your cellar. Installing an app update keeps your saved cellar.'
        : 'Your bottles and photos stay in this browser on this device. Clearing site data removes your cellar.</p><p>To install Grapleton, use your browser’s install option or Add to Home Screen from the Share menu on iPhone.') +
      '</p></div>' +

      '<div class="rack-panel"><h3>Backup &amp; restore</h3><p>Save your entire cellar, including photos, to a portable file. Keep it somewhere safe. Restoring replaces your current cellar.</p><div class="dialog-actions"><button class="secondary" data-action="backup-export">Export backup</button><button class="secondary" data-action="backup-import">Restore backup</button></div><p id="backup-status" role="status" aria-live="polite"></p><input id="backup-file" type="file" accept=".json,.grapleton,application/json" hidden></div>' +
      (window.grapletonNative ? '<div class="rack-panel settings-about"><h3>About Grapleton</h3><p>Version ' +
        escape(window.grapletonNative.version) + '</p><button class="secondary" data-action="privacy">Privacy &amp; your data</button></div>' : '') + '</section>';
    bindRackControl();
    return;
  }
  view.innerHTML = '<section><div class="section-top"><div><h2>' + (route === 'rack' ? 'Your racks' : 'Collection') +
    '</h2><p>' + (route === 'rack' ? 'Select a position to add or view a bottle.' : 'Find and view the bottles in your cellar.') +
    '</p></div><button class="primary section-add" data-action="add">＋ Add bottle</button></div>' +
    '<div class="search-box"><label for="search">Find a bottle</label><input type="search" id="search" autocomplete="off" ' +
    'placeholder="e.g. 2010 Shiraz"><p id="search-status" role="status"></p><ul id="results"></ul></div>' +
    (route === 'rack' ? rackControls() + rackMarkup() : '') + '</section>';
  $('#search').value = query;
  $('#search').addEventListener('input', event => {
    query = event.target.value;
    highlighted = undefined;
    $('.located', view)?.classList.remove('located');
    updateSearch();
  });
  updateSearch();
  bindRackControl();
  const rackScroll = $('.rack-scroll');
  if (rackScroll) rackObserver.observe(rackScroll);
}


const backupLimit = 256 * 1024 * 1024;
function photoToData(photo) {
  if (!photo) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read a bottle photo.'));
    reader.readAsDataURL(photo);
  });
}
async function exportBackup() {
  const status = $('#backup-status');
  saving = true;
  status.textContent = 'Preparing backup…';
  try {
    const snapshot = await readCellar();
    const racks = [];
    for (const rack of snapshot.racks) {
      const bottles = {};
      for (const [key, bottle] of Object.entries(rack.bottles)) {
        bottles[key] = { ...bottle, photo: await photoToData(bottle.photo) };
      }
      racks.push({ ...rack, bottles });
    }
    const file = new Blob([JSON.stringify({ format: 'grapleton-cellar', version: 1,
      exportedAt: new Date().toISOString(), racks })], { type: 'application/json' });
    if (file.size > backupLimit) throw new Error('Backup exceeds the 256 MiB portable file limit.');
    const filename = 'grapleton-' + new Date().toISOString().slice(0, 10) + '.json';
    if (window.grapletonNative) {
      await window.grapletonNative.exportBackup(await file.text(), filename);
      status.textContent = 'Backup prepared. Use the share sheet to save it somewhere safe.';
      return;
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'grapleton-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status.textContent = 'Backup prepared. Check your downloads and keep the file safe.';
  } catch (error) { status.textContent = error.message || 'Could not export backup.'; }
  finally { saving = false; }
}
async function parseBackup(file) {
  const invalid = () => { throw new Error('Invalid or unsupported Grapleton backup. Your cellar has not changed.'); };
  if (!file || file.size > backupLimit) invalid();
  let data;
  try { data = JSON.parse(await file.text()); } catch { invalid(); }
  if (!data || data.format !== 'grapleton-cellar' || data.version !== 1 ||
      !Array.isArray(data.racks) || !data.racks.length) invalid();
  const ids = new Set(), names = new Set(), racks = [];
  for (const rack of data.racks) {
    if (!rack || typeof rack.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(rack.id) ||
        ids.has(rack.id) || typeof rack.name !== 'string' || !rack.name.trim() || rack.name.length > 60 ||
        names.has(rack.name.toLowerCase()) ||
        !Number.isInteger(rack.rows) || rack.rows < 1 || rack.rows > 26 ||
        !Number.isInteger(rack.columns) || rack.columns < 1 || rack.columns > 24 ||
        !rack.bottles || typeof rack.bottles !== 'object' || Array.isArray(rack.bottles)) invalid();
    ids.add(rack.id); names.add(rack.name.toLowerCase());
    const bottles = {};
    for (const [key, bottle] of Object.entries(rack.bottles)) {
      if (!/^[1-9]\d*:[1-9]\d*$/.test(key)) invalid();
      const [row, col] = key.split(':').map(Number);
      if (row > rack.rows || col > rack.columns || !bottle || typeof bottle.name !== 'string' ||
          !bottle.name.trim() || !Object.hasOwn(styles, bottle.style)) invalid();
      const clean = {};
      for (const [field, max] of Object.entries({ name:120, style:20, vintage:4, variety:120,
          purchased:10, drinkBy:10, reason:200, pairings:200, notes:1000, purchasePrice:20 })) {
        const value = bottle[field] ?? '';
        if (typeof value !== 'string' || value.length > max) invalid();
        clean[field] = value;
      }
      if (clean.vintage && !/^\d{4}$/.test(clean.vintage)) invalid();
      if (clean.purchasePrice && (!/^\d+(?:\.\d{1,2})?$/.test(clean.purchasePrice) || Number(clean.purchasePrice) > 999999999)) invalid();
      for (const field of ['purchased','drinkBy']) {
        if (clean[field] && (!/^\d{4}-\d{2}-\d{2}$/.test(clean[field]) || !Number.isFinite(Date.parse(clean[field])) || new Date(clean[field]).toISOString().slice(0,10) !== clean[field])) invalid();
      }
      clean.photo = null;
      if (bottle.photo != null) {
        if (typeof bottle.photo !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(bottle.photo)) invalid();
        try {
          const raw = atob(bottle.photo.split(',')[1]);
          if (raw.length > 30 * 1024 * 1024 || raw.charCodeAt(0) !== 255 || raw.charCodeAt(1) !== 216) invalid();
          const blob = new Blob([Uint8Array.from(raw, char => char.charCodeAt(0))], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          try { const image = new Image(); image.src = url; await image.decode(); if (image.naturalWidth > 1200 || image.naturalHeight > 1200) invalid(); } finally { URL.revokeObjectURL(url); }
          clean.photo = blob;
        } catch { invalid(); }
      }
      bottles[key] = clean;
    }
    racks.push({ id: rack.id, name: rack.name, rows: rack.rows, columns: rack.columns, bottles });
  }
  return racks;
}
async function prepareRestore(file) {
  const status = $('#backup-status');
  if (!status || saving) return;
  saving = true;
  status.textContent = 'Checking backup…';
  try {
    const racks = await parseBackup(file);
    const count = racks.reduce((sum, rack) => sum + Object.keys(rack.bottles).length, 0);
    if (route !== 'settings' || !status.isConnected) return;
    status.textContent = '';
    openDialog('Restore cellar?', '<p>This backup contains ' + racks.length + ' rack(s) and ' + count +
      ' bottle(s). Restoring permanently replaces the cellar currently on this device. Export your current cellar first if you need to keep it.</p>' +
      '<p class="error" role="alert"></p><div class="dialog-actions"><button class="secondary" data-action="close">Cancel</button>' +
      '<button class="primary" id="restore-confirm">Replace cellar</button></div>');
    $('#restore-confirm').addEventListener('click', event => {
      commit({ ...cellar, racks }, event.currentTarget, $('.error', dialog), 'Cellar restored.', undefined, racks[0].id);
    });
  } catch (error) { status.textContent = error.message || 'Could not read backup.'; }
  finally { saving = false; }
}

function rackControls() {
  return '<div class="rack-controls"><label>Rack<select id="rack-picker">' + cellar.racks.map(rack =>
    '<option value="' + rack.id + '"' + (rack.id === currentRack().id ? ' selected' : '') + '>' +
    escape(rack.name) + '</option>').join('') + '</select></label>' +
    '<button class="secondary" data-action="new-rack">＋ Add rack</button></div>';
}

function bindRackControl() {
  $('#rack-picker')?.addEventListener('change', event => {
    activeRackId = event.target.value;
    highlighted = undefined;
    render();
    $('#rack-picker').focus();
  });
}

function locate(key, rackId) {
  if (window.grapletonNative && document.activeElement?.closest('.search-box')) document.activeElement.blur();
  activeRackId = rackId;
  highlighted = key;
  rackWindow.reveal = key;
  if (route !== 'rack') {
    location.hash = 'rack';
    return;
  }
  render();
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
  else $('.close', dialog).focus({ preventScroll: true });
  window.grapletonNativeUI?.animateDialog(dialog);
}

function closeDialog() {
  if (window.grapletonNativeUI) return window.grapletonNativeUI.closeDialog(dialog);
  dialog.close();
  return Promise.resolve();
}

dialog.addEventListener('close', () => {
  if (!dialog.open && document.activeElement === document.body && focusReturn?.isConnected) focusReturn.focus();
  else if (!dialog.open && route === 'rack' && highlighted) focusSlot(highlighted);
});
dialog.addEventListener('cancel', event => {
  if (saving) event.preventDefault();
  else if (window.grapletonNativeUI) {
    event.preventDefault();
    closeDialog();
  }
});

// Dates are stored as YYYY-MM-DD and presented in Australian day/month/year order.
function displayDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '')
    ? value.slice(8, 10) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4)
    : value;
}
function storedDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return value;
  return match[3] + '-' + match[2] + '-' + match[1];
}

const audPrice = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
function displayPurchasePrice(value) {
  if (value === undefined || value === null || value === '') return '';
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? audPrice.format(price) : '';
}

function showBottle(key) {
  const rack = currentRack();
  const bottle = rack.bottles[key];
  const extra = [
    ['Purchased', bottle.purchased], ['Purchase price', displayPurchasePrice(bottle.purchasePrice)], ['Purchase reason', bottle.reason],
    ['Drink by', bottle.drinkBy], ['Food pairings', bottle.pairings], ['Notes', bottle.notes],
  ].filter(([, value]) => value);
  const lookup = new URL('https://www.google.com/search');
  lookup.searchParams.set('q', [bottle.name, bottle.vintage, 'wine'].filter(Boolean).join(' '));
  const art = bottle.photo ? '<button type="button" class="detail-art photo-enlarge ' + styles[bottle.style] +
    '" data-action="enlarge-photo" data-key="' + key + '" aria-label="Enlarge bottle photo">' + photoMarkup(bottle) +
    '<span class="photo-enlarge-hint" aria-hidden="true">Tap to enlarge ⤢</span></button>' :
    '<div class="detail-art ' + styles[bottle.style] + '">' + photoMarkup(bottle) + '</div>';
  openDialog(bottle.name, '<div class="detail-top">' + art + '<div><span class="position">' + escape(rack.name) + ' · Slot ' + slotName(key) + '</span><p>' +
    escape([bottle.vintage, bottle.variety || bottle.style].filter(Boolean).join(' · ')) + '</p>' +
    (bottle.drinkBy ? '<p>Drink by <strong>' + escape(displayDate(bottle.drinkBy)) + '</strong></p>' : '') +
    '<a href="' + escape(lookup.href) + '" rel="noopener noreferrer" target="_blank">Look up wine ↗</a></div></div>' +
    (extra.length ? '<details class="extra"><summary>Purchase, pairings &amp; notes</summary><dl>' +
      extra.map(([label, value]) => '<dt>' + label + '</dt><dd>' + escape(label === 'Purchased' || label === 'Drink by' ? displayDate(value) : value) + '</dd>').join('') +
      '</dl></details>' : '') +
    '<div class="dialog-actions"><button class="quiet danger" data-action="remove" data-key="' + key + '">Remove</button>' +
    (route === 'collection' || route === 'cellar' ? '<button class="secondary" data-action="locate" data-key="' + key + '">Show in rack</button>' : '') +
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

async function commit(next, button, error, message, key, rackId = currentRack().id) {
  if (saving) return;
  const controls = window.grapletonNative ? [...dialog.querySelectorAll('button,input,select,textarea')] : [];
  const disabledStates = controls.map(control => control.disabled);
  controls.forEach(control => { control.disabled = true; });
  saving = true;
  button.disabled = true;
  error.textContent = '';
  try {
    cellar = await saveCellar(next, cellar.revision);
    if (activeRackId !== rackId) highlighted = undefined;
    activeRackId = rackId;
    if (window.grapletonNative && key) {
      highlighted = key;
      rackWindow.reveal = key;
    }
    await closeDialog();
    render();
    releaseUnusedImages();
    if (!key || !focusSlot(key)) ($('#rack-picker') ?? $('#search'))?.focus();
    if (!document.activeElement || document.activeElement === document.body) $('#main').focus();
    notify(message);
  } catch (failure) {
    error.textContent = failure.message;
    button.disabled = false;
  } finally {
    saving = false;
    controls.forEach((control, index) => { control.disabled = disabledStates[index]; });
  }
}

function editBottle(key, recovered) {
  const rack = currentRack();
  const existing = rack.bottles[key];
  const destinations = cellar.racks.filter(item => (item === rack && existing) || freeSlots(item).length);
  if (!destinations.length) {
    openDialog('Your racks are full', '<p>Make room by extending a rack or adding another one.</p>' +
      '<div class="dialog-actions"><button class="secondary" data-action="rack-settings">Edit rack</button><button class="primary" data-action="new-rack">Add rack</button></div>');
    return;
  }
  openDialog(existing ? 'Edit bottle' : 'Add bottle', '');
  const generation = dialogContent;
  dialog.append($('#bottle-form').content.cloneNode(true));
  window.grapletonNativeUI?.animateDialog(dialog);
  const form = $('#edit-form');
  const select = form.elements.slot;
  if (existing) $('[data-action="cancel-edit"]', form).dataset.key = key;
  const rackSelect = form.elements.rack;
  for (const destination of destinations) {
    rackSelect.add(new Option(destination.name, destination.id, false, destination === rack));
  }
  const showPositions = () => {
    const destination = destinations.find(item => item.id === rackSelect.value);
    select.replaceChildren();
    for (const position of slotKeys(destination)) {
      const isCurrent = destination === rack && position === key;
      if (isCurrent || !destination.bottles[position]) {
        select.add(new Option(slotName(position), position, false, isCurrent));
      }
    }
  };
  rackSelect.addEventListener('change', showPositions);
  showPositions();

  const variety = form.elements.variety;
  variety.add(new Option('Select variety', ''));
  for (const name of varieties) variety.add(new Option(name, name));
  if (existing?.variety && !varieties.includes(existing.variety)) {
    variety.add(new Option(existing.variety, existing.variety));
  }
  for (const field of ['name', 'style', 'vintage', 'variety', 'purchased', 'purchasePrice', 'drinkBy', 'reason', 'pairings', 'notes']) {
    if (existing?.[field]) form.elements[field].value = existing[field];
  }
  if (recovered) {
    const recoveredVariety = recovered.fields.variety;
    if (recoveredVariety && ![...variety.options].some(option => option.value === recoveredVariety)) {
      variety.add(new Option(recoveredVariety, recoveredVariety));
    }
    for (const [field, value] of Object.entries(recovered.fields)) {
      if (form.elements[field]) form.elements[field].value = value;
    }
    showPositions();
    form.elements.slot.value = recovered.fields.slot;
    if (!form.elements.slot.value) select.selectedIndex = 0;
  }
  let photo = recovered?.photo ?? existing?.photo ?? null;
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
  if (window.grapletonNative) {
    dialog.addEventListener('close', () => {
      recoveredCameraDraft = undefined;
      saveCameraDraft(null).catch(console.warn);
    }, { once: true });
  }
  form.elements.style.addEventListener('change', updatePreview);
  clear.addEventListener('click', () => {
    photo = null;
    updatePreview();
    status.textContent = 'Photo removed.';
  });
  const nativePhoto = async source => {
    submit.disabled = true;
    const controls = form.querySelectorAll('.photo-actions button');
    controls.forEach(button => { button.disabled = true; });
    status.textContent = 'Opening photos…';
    try {
      const fields = Object.fromEntries(new FormData(form));
      for (const field of ['purchased', 'drinkBy']) fields[field] = storedDate(fields[field]);
      await saveCameraDraft({ key, rackId: rack.id, fields, photo });
      const file = await window.grapletonNative.getPhoto(source);
      if (!dialog.open || generation !== dialogContent) return;
      if (file) {
        photo = await compressPhoto(file);
        updatePreview();
        status.textContent = 'Photo ready.';
      } else status.textContent = '';
      await saveCameraDraft(null);
    } catch {
      await saveCameraDraft(null).catch(console.warn);
      status.textContent = 'Could not open the photo. Check access in device settings and try again.';
    } finally {
      submit.disabled = false;
      controls.forEach(button => { button.disabled = false; });
    }
  };
  if (window.grapletonNative) {
    for (const source of ['camera', 'library']) {
      $('[data-action="' + source + '"]', form).addEventListener('click', event => {
        event.stopPropagation();
        nativePhoto(source);
      });
    }
  }
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
  form.elements.purchasePrice.addEventListener('input', () => form.elements.purchasePrice.setCustomValidity(''));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries([...new FormData(form)].map(([name, value]) => [name, value.trim()]));
    for (const field of ['purchased', 'drinkBy']) values[field] = storedDate(values[field]);
    if (values.purchasePrice !== '') {
      const price = Number(values.purchasePrice);
      if (!/^\d+(?:\.\d{1,2})?$/.test(values.purchasePrice) || !Number.isFinite(price) || price > 999999999) {
        form.elements.purchasePrice.setCustomValidity('Enter a valid price in AUD, with up to two decimal places.');
        form.elements.purchasePrice.reportValidity();
        return;
      }
      values.purchasePrice = price.toFixed(2);
    }
    form.elements.purchasePrice.setCustomValidity('');

    if (!values.name) {
      form.elements.name.setCustomValidity('Enter a wine name.');
      form.elements.name.reportValidity();
      return;
    }
    const { slot, rack: destinationId, ...details } = values;
    let racks = cellar.racks;
    if (existing) {
      const bottles = { ...rack.bottles };
      delete bottles[key];
      racks = replaceRack(racks, { ...rack, bottles });
    }
    const destination = racks.find(item => item.id === destinationId);
    racks = replaceRack(racks, { ...destination, bottles: { ...destination.bottles, [slot]: { ...details, photo } } });
    commit({ ...cellar, racks }, submit, $('.error', form),
      'Bottle saved in ' + destination.name + ' · ' + slotName(slot) + '.', slot, destinationId);
  });
  $('.close', dialog).focus({ preventScroll: true });
  dialog.scrollTop = 0;
}

function editRack(creating = false) {
  const rack = creating ? { name: '', rows: 3, columns: 6, bottles: {} } : currentRack();
  openDialog(creating ? 'Add rack' : 'Edit rack', '<form id="rack-form"><p>Set the number of rows and columns in your physical rack.</p>' +
    '<div class="fields"><label class="wide">Rack name<input name="name" required maxlength="60" placeholder="e.g. Garage cellar" value="' + escape(rack.name) + '"></label><label>Rows<input name="rows" type="number" min="1" max="26" required value="' + rack.rows +
    '"></label><label>Columns<input name="columns" type="number" min="1" max="24" required value="' + rack.columns +
    '"></label></div><p class="error" role="alert"></p><div class="dialog-actions"><button type="button" class="secondary" ' +
    'data-action="close">Cancel</button><button class="primary">Save rack</button></div></form>');
  const form = $('#rack-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const rows = form.elements.rows.valueAsNumber;
    const columns = form.elements.columns.valueAsNumber;
    const name = form.elements.name.value.trim();
    const error = $('.error', form);
    if (!name || cellar.racks.some(item => item.id !== rack.id && item.name.toLowerCase() === name.toLowerCase())) {
      error.textContent = name ? 'Choose a name you haven’t used for another rack.' : 'Enter a rack name.';
      return;
    }
    const outside = entries(rack).filter(key => {
      const [row, column] = key.split(':').map(Number);
      return row > rows || column > columns;
    });
    if (outside.length) {
      error.textContent = 'Move or remove bottles in ' + outside.map(slotName).join(', ') + ' before shrinking the rack.';
      return;
    }
    const updated = { ...rack, id: rack.id ?? crypto.randomUUID(), name, rows, columns };
    const racks = creating ? [...cellar.racks, updated] : replaceRack(cellar.racks, updated);
    commit({ ...cellar, racks }, $('button.primary', form), error, creating ? 'Rack added.' : 'Rack updated.', undefined, updated.id);
  });
  form.elements.name.focus();
}

function removeBottle(key) {
  openDialog('Remove bottle?', '<p>Remove <strong>' + escape(currentRack().bottles[key].name) + '</strong> from ' +
    slotName(key) + '? Its saved details and photo will be deleted.</p><p class="error" role="alert"></p>' +
    '<div class="dialog-actions"><button class="secondary" data-action="slot" data-key="' + key +
    '">Keep bottle</button><button class="primary" data-action="confirm-remove" data-key="' + key + '">Remove bottle</button></div>');
}

async function showPrivacy() {
  try {
    const response = await fetch('./privacy.html');
    if (!response.ok) throw new Error('Privacy page unavailable');
    const document = new DOMParser().parseFromString(await response.text(), 'text/html');
    const content = document.querySelector('main');
    content.querySelector('a')?.remove();
    content.querySelector('h1')?.remove();
    openDialog('Privacy & your data', '<div class="privacy-content">' + content.innerHTML + '</div>');
  } catch {
    notify('Could not open the privacy page. Please try again.');
  }
}

document.addEventListener('click', event => {
  const control = event.target.closest('[data-action]');
  if (!control || !cellar || saving) return;
  const { action, key, rack } = control.dataset;
  switch (action) {
    case 'rack-page':
      rackWindow.page += Number(control.dataset.step);
      highlighted = undefined;
      updateNativeRack();
      const pagerFocus = view.querySelector('.rack-pager button[data-step="' + control.dataset.step + '"]:not(:disabled)')
        ?? view.querySelector('.rack-pager button:not(:disabled)');
      pagerFocus?.focus({ preventScroll: true });
      break;
    case 'privacy': showPrivacy(); break;
    case 'open-rack':
      activeRackId = rack;
      highlighted = undefined;
      query = '';
      if (route === 'rack') render();
      else location.hash = 'rack';
      break;
    case 'backup-export': exportBackup(); break;
    case 'backup-import': {
      const input = $('#backup-file');
      input.onchange = () => { const file = input.files[0]; input.value = ''; if (file) prepareRestore(file); };
      input.click(); break;
    }
    case 'add': editBottle(); break;
    case 'rack-settings': editRack(); break;
    case 'new-rack': editRack(true); break;
    case 'slot':
      if (route === 'rack') {
        highlighted = key;
        $('.located', view)?.classList.remove('located');
        control.classList.add('located');
      }
      if (rack && rack !== activeRackId) {
        activeRackId = rack;
        highlighted = undefined;
      }
      if (currentRack().bottles[key]) showBottle(key);
      else editBottle(key);
      break;
    case 'locate':
      if (dialog.open) closeDialog().then(() => locate(key, rack ?? currentRack().id));
      else locate(key, rack ?? currentRack().id);
      break;
    case 'enlarge-photo': {
      const bottle = currentRack().bottles[key];
      if (bottle?.photo) openPhotoViewer(bottle.photo, bottle.name, control);
      break;
    }
    case 'edit': editBottle(key); break;
    case 'remove': removeBottle(key); break;
    case 'cancel-edit': if (currentRack().bottles[key]) showBottle(key); else closeDialog(); break;
    case 'close': closeDialog(); break;
    case 'camera':
    case 'library': $('#' + action, dialog).click(); break;
    case 'confirm-remove': {
      const current = currentRack();
      const bottles = { ...current.bottles };
      delete bottles[key];
      const racks = replaceRack(cellar.racks, { ...current, bottles });
      commit({ ...cellar, racks }, control, $('.error', dialog), 'Bottle removed.', key);
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

async function setupAppUpdates() {
  const workers = navigator.serviceWorker;
  const registration = await workers.register('./sw.js', { updateViaCache: 'none' });
  const button = $('#update-button');
  const status = $('#update-status');
  let controller = workers.controller;
  let reloadAvailable = false;
  let applying = false;
  let activationTimeout;

  function showAvailable() {
    button.textContent = reloadAvailable || registration.waiting ? 'Update app' : 'Check for updates';
  }

  function waitForInstall(worker) {
    return new Promise(resolve => {
      function checkState() {
        if (!['installed', 'activating', 'activated', 'redundant'].includes(worker.state)) return;
        worker.removeEventListener('statechange', checkState);
        resolve(worker.state);
      }
      worker.addEventListener('statechange', checkState);
      checkState();
    });
  }

  workers.addEventListener('controllerchange', () => {
    const previous = controller;
    controller = workers.controller;
    if (!previous || !controller || previous === controller) return;
    reloadAvailable = true;
    clearTimeout(activationTimeout);
    if (applying && !dialog.open && !saving) {
      location.reload();
      return;
    }
    applying = false;
    button.disabled = false;
    showAvailable();
    status.textContent = 'An update is ready. Finish any open edits, then update the app.';
  });

  function watchInstall() {
    if (!registration.installing) return;
    waitForInstall(registration.installing).then(() => {
      if (button.disabled) return;
      showAvailable();
      if (registration.waiting) status.textContent = 'An update is ready.';
    });
  }

  registration.addEventListener('updatefound', watchInstall);
  watchInstall();
  showAvailable();
  $('#app-update').hidden = false;

  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (!reloadAvailable && !registration.waiting) {
        status.textContent = 'Checking for updates…';
        if (!navigator.onLine) throw new Error('Offline');
        await registration.update();
        const installing = registration.installing;
        if (installing && await waitForInstall(installing) === 'redundant') {
          throw new Error('Update download failed');
        }
      }
      if (dialog.open || saving) {
        status.textContent = 'Finish your edit, then try again.';
      } else if (reloadAvailable) {
        location.reload();
        return;
      } else if (registration.waiting) {
        applying = true;
        status.textContent = 'Updating Grapleton…';
        registration.waiting.postMessage('grapleton:apply-update');
        activationTimeout = setTimeout(() => {
          applying = false;
          button.disabled = false;
          showAvailable();
          status.textContent = 'The update is taking longer than expected. Try again shortly.';
        }, 10000);
        return;
      } else {
        status.textContent = 'Grapleton is up to date.';
      }
    } catch {
      applying = false;
      status.textContent = 'Could not check for updates. Try again when you’re online.';
    }
    showAvailable();
    button.disabled = false;
  });
}

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
  if (window.grapletonNative) {
    const recoverCamera = async () => {
      const draft = await readCameraDraft() ?? recoveredCameraDraft;
      if (!draft || !cellar.racks.some(rack => rack.id === draft.rackId)) return;
      if (window.grapletonRestoredPhoto) {
        draft.photo = await compressPhoto(await (await fetch(window.grapletonRestoredPhoto)).blob());
        window.grapletonRestoredPhoto = null;
      }
      activeRackId = draft.rackId;
      recoveredCameraDraft = draft;
      editBottle(draft.key, draft);
      await saveCameraDraft(null);
      notify('Your bottle draft was recovered. Review it and save.');
    };
    window.addEventListener('grapleton:restored-photo', () => recoverCamera().catch(console.warn));
    await recoverCamera();
  }
  window.addEventListener('hashchange', () => {
    render();
    if (route === 'rack' && highlighted) focusSlot(highlighted, true);
    else if (window.grapletonNative) window.scrollTo({ top: 0 });
  });
  window.addEventListener('focus', () => refresh().catch(console.warn));
  dialog.addEventListener('close', () => refresh().catch(console.warn));
  if (!window.grapletonNative && 'serviceWorker' in navigator) setupAppUpdates().catch(console.warn);
} catch {
  view.innerHTML = '<p role="alert">Grapleton could not open browser storage. Enable site storage and reload to use your cellar.</p>';
  document.querySelectorAll('[data-action]').forEach(button => { button.disabled = true; });
}
