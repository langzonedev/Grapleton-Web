const icon = paths => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';

const icons = {
  cellar: icon('<path d="M5 21V8a7 7 0 0 1 14 0v13H5Z"/><path d="M9 21v-7a3 3 0 0 1 6 0v7M5 8h14M12 1v7"/>'),
  rack: icon('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18M12 3v18"/><circle cx="7.5" cy="7.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>'),
  collection: icon('<path d="M8 3h8l1 6a5 5 0 0 1-10 0l1-6ZM12 14v7M8 21h8M7 8h10"/>'),
  settings: icon('<rect x="4" y="3" width="16" height="5" rx="2.5"/><path d="M12 8v3c-6 0-6 4 0 4s6 4 0 4l-2 2M7 5.5h10"/>'),
};

const routes = [['cellar', 'My Cellar'], ['rack', 'Rack'], ['collection', 'Collection'], ['settings', 'Settings']];
let selectionSheet;
let selectedSource;
let sequence = 0;
const enhanced = new WeakMap();

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
  if (selectionSheet?.open) selectionSheet.close();
  enhanceSelect(select);
  const trigger = enhanced.get(select);
  if (!trigger) return;
  const sourceId = select.id;
  const sourceName = select.name;
  const sourceForm = select.form;
  syncSelect(select);
  const sheet = document.createElement('dialog');
  const id = 'native-choice-' + ++sequence;
  sheet.className = 'native-choice-sheet';
  sheet.setAttribute('aria-labelledby', id);
  sheet.innerHTML = '<div class="native-sheet-top"><h2 id="' + id + '"></h2>' +
    '<button type="button" class="quiet native-sheet-close" aria-label="Close selection">' + icon('<path d="m7 7 10 10M17 7 7 17"/>') + '</button></div>' +
    '<label class="native-choice-search">Find an option<input type="search" autocomplete="off" placeholder="Search options"></label>' +
    '<div class="native-choice-options"></div><p class="native-choice-status" role="status"></p>';
  sheet.querySelector('h2').textContent = fieldTitle(select);
  const search = sheet.querySelector('input');
  const list = sheet.querySelector('.native-choice-options');
  const status = sheet.querySelector('.native-choice-status');
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
        sheet.close();
      });
      list.append(button);
    }
    status.textContent = options.length ? '' : 'No matching options. Try another search.';
  };
  search.addEventListener('input', renderOptions);
  sheet.querySelector('.native-sheet-close').addEventListener('click', () => sheet.close());
  sheet.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    const options = [...list.querySelectorAll('button:not(:disabled)')];
    if (!options.length) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const current = options.indexOf(document.activeElement);
    options[(current + direction + options.length) % options.length].focus();
  });
  sheet.addEventListener('close', () => {
    trigger.setAttribute('aria-expanded', 'false');
    if (selectionSheet === sheet) {
      selectionSheet = undefined;
      selectedSource = undefined;
    }
    sheet.remove();
    requestAnimationFrame(() => {
      const replacement = sourceId ? document.getElementById(sourceId)
        : sourceForm?.isConnected && sourceName ? sourceForm.elements.namedItem(sourceName) : undefined;
      const target = trigger.isConnected ? trigger : enhanced.get(replacement);
      target?.focus({ preventScroll: true });
    });
  }, { once: true });
  document.body.append(sheet);
  selectionSheet = sheet;
  selectedSource = select;
  renderOptions();
  trigger.setAttribute('aria-expanded', 'true');
  sheet.showModal();
  sheet.querySelector('.native-sheet-close').focus();
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
    if (selectionSheet?.open && !selectedSource?.isConnected) selectionSheet.close();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'selected', 'label'] });
  document.querySelectorAll('select').forEach(enhanceSelect);
  window.grapletonNativeUI = { renderNavigation, openSelect };
  renderNavigation(location.hash.slice(1) || 'cellar');
  return window.grapletonNativeUI;
}
