// Touch-first calendar. The original form field stores ISO YYYY-MM-DD dates.
const months = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat('en-AU', { month: 'long' }).format(new Date(2024, i, 1)));
const pad = n => String(n).padStart(2, '0');
const isoToDisplay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  ? value.slice(8, 10) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : (value || '');
const displayToIso = value => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  return match ? match[3] + '-' + match[2] + '-' + match[1] : (value || '');
};
const makeButton = (label, aria, action, className = '') => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-label', aria);
  if (className) button.className = className;
  button.addEventListener('click', action);
  return button;
};
let active = null;
function dismiss() {
  if (!active) return;
  const { popup, trigger } = active;
  popup.remove();
  trigger.setAttribute('aria-expanded', 'false');
  active = null;
}
function showCalendar(input) {
  if (active?.trigger === input) { dismiss(); return; }
  dismiss();
  const stored = displayToIso(input.value);
  const initial = /^\d{4}-\d{2}-\d{2}$/.test(stored)
    ? stored.split('-').map(Number) : null;
  const now = new Date();
  let year = initial?.[0] ?? now.getFullYear();
  let month = (initial?.[1] ?? now.getMonth() + 1) - 1;
  let view = 'days';
  let yearPage = Math.floor(year / 12) * 12;
  const popup = document.createElement('div');
  popup.className = 'grapleton-calendar';
  popup.setAttribute('role', 'group');
  popup.setAttribute('aria-label', input.name === 'drinkBy' ? 'Choose drink-by date' : 'Choose purchase date');
  const heading = document.createElement('div');
  heading.className = 'calendar-heading';
  const prev = makeButton('‹', 'Previous', () => navigate(-1), 'calendar-arrow');
  const next = makeButton('›', 'Next', () => navigate(1), 'calendar-arrow');
  const title = makeButton('', 'Change month and year', () => {
    view = view === 'days' ? 'months' : 'years';
    paint();
  }, 'calendar-title');
  const panel = document.createElement('div');
  const actions = document.createElement('div');
  actions.className = 'calendar-actions';
  actions.append(
    makeButton('Today', 'Select today', () => {
      const n = new Date();
      choose(n.getFullYear() + '-' + pad(n.getMonth() + 1) + '-' + pad(n.getDate()));
    }),
    makeButton('Clear', 'Clear date', () => choose(''))
  );
  heading.append(prev, title, next);
  popup.append(heading, panel, actions);
  input.after(popup);
  input.setAttribute('aria-expanded', 'true');
  active = { popup, trigger: input };

  function choose(value) {
    input.value = isoToDisplay(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    dismiss();
    input.focus({ preventScroll: true });
  }
  function navigate(delta) {
    if (view === 'years') {
      yearPage = Math.max(1800, Math.min(2184, yearPage + delta * 12));
    } else if (view === 'months') {
      year = Math.max(1800, Math.min(2200, year + delta));
      yearPage = Math.floor(year / 12) * 12;
    } else {
      const date = new Date(year, month + delta, 1);
      if (date.getFullYear() < 1800 || date.getFullYear() > 2200) return;
      year = date.getFullYear();
      month = date.getMonth();
      yearPage = Math.floor(year / 12) * 12;
    }
    paint();
  }
  function paint() {
    panel.replaceChildren();
    if (view === 'years') {
      title.textContent = yearPage + ' – ' + (yearPage + 11);
      title.setAttribute('aria-label', 'Select a year');
      panel.className = 'calendar-choice-grid';
      for (let y = yearPage; y < yearPage + 12; y++) {
        const selected = y === year;
        const btn = makeButton(String(y), 'Year ' + y, () => {
          year = y; view = 'months'; paint();
        }, 'calendar-choice' + (selected ? ' selected' : ''));
        btn.setAttribute('aria-pressed', String(selected));
        panel.append(btn);
      }
    } else if (view === 'months') {
      title.textContent = String(year) + ' · Select month';
      title.setAttribute('aria-label', 'Choose year, currently ' + year);
      panel.className = 'calendar-choice-grid';
      months.forEach((name, i) => {
        const selected = i === month;
        const btn = makeButton(name.slice(0, 3), name, () => {
          month = i; view = 'days'; paint();
        }, 'calendar-choice' + (selected ? ' selected' : ''));
        btn.setAttribute('aria-pressed', String(selected));
        panel.append(btn);
      });
    } else {
      title.textContent = months[month] + ' ' + year + ' ▾';
      title.setAttribute('aria-label', 'Select month or year, currently ' + months[month] + ' ' + year);
      panel.className = 'calendar-day-panel';
      const weekdays = document.createElement('div');
      weekdays.className = 'calendar-weekdays';
      ['M','T','W','T','F','S','S'].forEach((name, i) => {
        const cell = document.createElement('span');
        cell.textContent = name;
        cell.setAttribute('aria-label', ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'][i]);
        weekdays.append(cell);
      });
      const days = document.createElement('div');
      days.className = 'calendar-days';
      const offset = (new Date(year, month, 1).getDay() + 6) % 7;
      for (let n = 0; n < offset; n++) days.append(document.createElement('span'));
      const count = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= count; d++) {
        const value = year + '-' + pad(month + 1) + '-' + pad(d);
        const selected = displayToIso(input.value) === value;
        const button = makeButton(String(d), value, () => choose(value), selected ? 'selected' : '');
        button.setAttribute('aria-pressed', String(selected));
        days.append(button);
      }
      panel.append(weekdays, days);
    }
    prev.disabled = view === 'years' ? yearPage <= 1800 : year <= 1800 && (view !== 'days' || month === 0);
    next.disabled = view === 'years' ? yearPage >= 2184 : year >= 2200 && (view !== 'days' || month === 11);
  }
  paint();
}
function enhance(form) {
  for (const input of form.querySelectorAll('input[type="date"]')) {
    if (input.dataset.calendarEnhanced) continue;
    input.dataset.calendarEnhanced = 'true';
    const original = input.value;
    input.type = 'text';
    input.value = isoToDisplay(original);
    input.readOnly = true;
    input.placeholder = 'Select date';
    input.classList.add('calendar-date-field');
    input.setAttribute('aria-haspopup', 'dialog');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-label', (input.name === 'drinkBy' ? 'Drink by' : 'Purchase date') + ', select date');
    input.addEventListener('click', () => showCalendar(input));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        showCalendar(input);
      }
    });
  }
}
const observer = new MutationObserver(() => {
  const form = document.querySelector('#edit-form');
  if (form) enhance(form);
  if (active && !active.trigger.isConnected) dismiss();
});
observer.observe(document.querySelector('#dialog'), { childList: true, subtree: true });
document.addEventListener('pointerdown', event => {
  if (active && !active.popup.contains(event.target) && !active.trigger.contains(event.target)) dismiss();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && active) {
    event.stopPropagation();
    dismiss();
  }
}, true);
