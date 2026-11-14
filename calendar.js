// Enhanced calendar for bottle dates. Keeps the existing ISO date inputs as the source of truth.
const months = Array.from({length: 12}, (_, i) => new Intl.DateTimeFormat('en-AU', {month: 'long'}).format(new Date(2024, i, 1)));
const pad = n => String(n).padStart(2, '0');
let active;

function dismiss() {
  if (!active) return;
  active.popup.remove();
  active.trigger.setAttribute('aria-expanded', 'false');
  active = null;
}
function showCalendar(input, trigger) {
  if (active?.trigger === trigger) { dismiss(); return; }
  dismiss();
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(input.value) ? input.value.split('-').map(Number) : null;
  const now = new Date();
  let year = initial?.[0] ?? now.getFullYear();
  let month = (initial?.[1] ?? now.getMonth() + 1) - 1;
  const popup = document.createElement('div');
  popup.className = 'grapleton-calendar';
  popup.setAttribute('role', 'group');
  popup.setAttribute('aria-label', input.name === 'drinkBy' ? 'Choose drink-by date' : 'Choose purchase date');
  const heading = document.createElement('div');
  heading.className = 'calendar-heading';
  const prev = document.createElement('button');
  prev.type = 'button'; prev.textContent = '‹'; prev.setAttribute('aria-label', 'Previous month');
  const next = document.createElement('button');
  next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Next month');
  const monthSelect = document.createElement('select');
  monthSelect.setAttribute('aria-label', 'Month');
  months.forEach((name, index) => monthSelect.add(new Option(name, String(index))));
  const yearInput = document.createElement('input');
  yearInput.type = 'number'; yearInput.min = '1800'; yearInput.max = '2200';
  yearInput.step = '1'; yearInput.inputMode = 'numeric'; yearInput.setAttribute('aria-label', 'Year');
  const days = document.createElement('div');
  days.className = 'calendar-days';
  heading.append(prev, monthSelect, yearInput, next);
  const labels = document.createElement('div');
  labels.className = 'calendar-weekdays';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => {
    const cell = document.createElement('span'); cell.textContent = d;
    cell.setAttribute('aria-label', ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]);
    labels.append(cell);
  });
  const actions = document.createElement('div');
  actions.className = 'calendar-actions';
  const today = document.createElement('button');
  today.type = 'button'; today.textContent = 'Today';
  const clear = document.createElement('button');
  clear.type = 'button'; clear.textContent = 'Clear';
  actions.append(today, clear);
  popup.append(heading, labels, days, actions);
  trigger.after(popup);
  trigger.setAttribute('aria-expanded', 'true');
  active = {popup, trigger};
  function paint() {
    monthSelect.value = String(month);
    yearInput.value = String(year);
    days.replaceChildren();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7;
    const length = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < offset; i++) days.append(document.createElement('span'));
    for (let d = 1; d <= length; d++) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = String(d);
      const iso = year + '-' + pad(month + 1) + '-' + pad(d);
      button.setAttribute('aria-label', iso);
      if (input.value === iso) { button.classList.add('selected'); button.setAttribute('aria-pressed', 'true'); }
      button.addEventListener('click', () => choose(iso));
      days.append(button);
    }
  }
  function choose(value) {
    input.value = value;
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new Event('change', {bubbles: true}));
    dismiss();
    trigger.focus();
  }
  function move(delta) {
    const date = new Date(year, month + delta, 1);
    year = date.getFullYear(); month = date.getMonth(); paint();
  }
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  monthSelect.addEventListener('change', () => { month = Number(monthSelect.value); paint(); });
  yearInput.addEventListener('change', () => {
    const nextYear = Number(yearInput.value);
    if (Number.isInteger(nextYear) && nextYear >= 1800 && nextYear <= 2200) year = nextYear;
    paint();
  });
  yearInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); yearInput.blur(); } });
  today.addEventListener('click', () => {
    const n = new Date(); choose(n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()));
  });
  clear.addEventListener('click', () => choose(''));
  paint();
  yearInput.focus();
}
function enhance(form) {
  for (const input of form.querySelectorAll('input[type="date"]')) {
    if (input.dataset.calendarEnhanced) continue;
    input.dataset.calendarEnhanced = 'true';
    // Replace the browser-native date picker with one tap target.
    // The underlying value remains YYYY-MM-DD for existing saved bottles.
    input.type = 'text';
    input.readOnly = true;
    input.placeholder = 'Select date';
    input.classList.add('calendar-date-field');
    input.setAttribute('aria-haspopup', 'dialog');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-label', (input.name === 'drinkBy' ? 'Drink by' : 'Purchase date') + ', select date');
    input.addEventListener('click', () => showCalendar(input, input));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showCalendar(input, input);
      }
    });
  }
}
const observer = new MutationObserver(() => {
  const form = document.querySelector('#edit-form');
  if (form) enhance(form);
  if (active && !active.trigger.isConnected) dismiss();
});
observer.observe(document.querySelector('#dialog'), {childList: true, subtree: true});
document.addEventListener('pointerdown', event => {
  if (active && !active.popup.contains(event.target) && !active.trigger.contains(event.target)) dismiss();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && active) { event.stopPropagation(); dismiss(); }
}, true);
