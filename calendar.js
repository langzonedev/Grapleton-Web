// Grapleton's responsive, touch-first date picker.
// Saved dates remain ISO (YYYY-MM-DD); people see Australian DD/MM/YYYY.
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const padDate = n => String(n).padStart(2, '0');
const isoToDisplay = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '')
  ? value.slice(8, 10) + '/' + value.slice(5, 7) + '/' + value.slice(0, 4) : (value || '');
const displayToIso = value => {
  const found = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value || '');
  return found ? found[3] + '-' + found[2] + '-' + found[1] : (value || '');
};
function dateButton(text, label, callback, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.setAttribute('aria-label', label);
  button.className = className;
  button.addEventListener('click', callback);
  return button;
}
let calendarActive = null;
function closeCalendar() {
  if (!calendarActive) return;
  const { popup, input } = calendarActive;
  calendarActive = null;
  input.setAttribute('aria-expanded', 'false');
  if (popup.open) popup.close();
  popup.remove();
  if (input.isConnected && document.querySelector('#dialog')?.open) {
    input.focus({ preventScroll: true });
  }
}
function openCalendar(input) {
  if (calendarActive) closeCalendar();
  const previous = displayToIso(input.value);
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(previous)
    ? previous.split('-').map(Number) : null;
  const today = new Date();
  let year = parsed?.[0] ?? today.getFullYear();
  let month = (parsed?.[1] ?? today.getMonth() + 1) - 1;
  let mode = 'days';
  let yearStart = Math.floor(year / 12) * 12;

  // Native dialog enters the top layer above the bottle editor, rather than
  // being clipped by the editor's narrow columns or its scrolling container.
  const popup = document.createElement('dialog');
  popup.className = 'grapleton-date-dialog';
  popup.setAttribute('aria-label', input.name === 'drinkBy' ? 'Choose drink-by date' : 'Choose purchase date');
  const top = document.createElement('div');
  top.className = 'date-dialog-top';
  const title = document.createElement('strong');
  title.textContent = input.name === 'drinkBy' ? 'Drink by' : 'Purchase date';
  const close = dateButton('×', 'Close date picker', closeCalendar, 'date-close');
  top.append(title, close);

  const navigation = document.createElement('div');
  navigation.className = 'date-navigation';
  const back = dateButton('‹', 'Previous month', () => move(-1), 'date-nav-arrow');
  const monthButton = dateButton('', 'Choose month', () => { mode = 'months'; render(); }, 'date-nav-month');
  const yearButton = dateButton('', 'Choose year', () => {
    mode = 'years';
    yearStart = Math.floor(year / 12) * 12;
    render();
  }, 'date-nav-year');
  const forward = dateButton('›', 'Next month', () => move(1), 'date-nav-arrow');
  navigation.append(back, monthButton, yearButton, forward);

  const grid = document.createElement('div');
  grid.className = 'date-grid';
  const actions = document.createElement('div');
  actions.className = 'date-actions';
  actions.append(
    dateButton('Clear', 'Clear selected date', () => choose(''), 'date-clear'),
    dateButton('Today', 'Select today', () => {
      const now = new Date();
      choose(now.getFullYear() + '-' + padDate(now.getMonth() + 1) + '-' + padDate(now.getDate()));
    }, 'date-today')
  );
  popup.append(top, navigation, grid, actions);
  document.body.append(popup);
  input.setAttribute('aria-expanded', 'true');
  calendarActive = { popup, input };
  popup.addEventListener('close', () => {
    if (calendarActive?.popup === popup) closeCalendar();
  });
  popup.showModal();

  function choose(iso) {
    input.value = isoToDisplay(iso);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    closeCalendar();
  }
  function move(delta) {
    if (mode === 'years') {
      yearStart = Math.min(2184, Math.max(1800, yearStart + delta * 12));
    } else if (mode === 'months') {
      year = Math.min(2200, Math.max(1800, year + delta));
    } else {
      const next = new Date(year, month + delta, 1);
      if (next.getFullYear() < 1800 || next.getFullYear() > 2200) return;
      year = next.getFullYear();
      month = next.getMonth();
    }
    render();
  }
  function render() {
    grid.replaceChildren();
    monthButton.textContent = mode === 'years' ? yearStart + '–' + (yearStart + 11) : MONTHS[month];
    yearButton.textContent = String(year) + ' ▾';
    monthButton.setAttribute('aria-pressed', String(mode === 'months'));
    yearButton.setAttribute('aria-pressed', String(mode === 'years'));
    back.setAttribute('aria-label', mode === 'days' ? 'Previous month' : mode === 'months' ? 'Previous year' : 'Previous 12 years');
    forward.setAttribute('aria-label', mode === 'days' ? 'Next month' : mode === 'months' ? 'Next year' : 'Next 12 years');
    back.disabled = mode === 'years' ? yearStart <= 1800 : year <= 1800 && (mode !== 'days' || month === 0);
    forward.disabled = mode === 'years' ? yearStart >= 2184 : year >= 2200 && (mode !== 'days' || month === 11);

    if (mode === 'years') {
      grid.className = 'date-grid date-years';
      for (let value = yearStart; value < yearStart + 12 && value <= 2200; value++) {
        const selected = value === year;
        const yearValue = value;
        const button = dateButton(String(value), 'Select ' + value, () => {
          year = yearValue;
          mode = 'months';
          render();
        }, selected ? 'selected' : '');
        button.setAttribute('aria-pressed', String(selected));
        grid.append(button);
      }
    } else if (mode === 'months') {
      grid.className = 'date-grid date-months';
      MONTHS.forEach((value, index) => {
        const selected = index === month;
        const button = dateButton(value.slice(0, 3), value, () => {
          month = index;
          mode = 'days';
          render();
        }, selected ? 'selected' : '');
        button.setAttribute('aria-pressed', String(selected));
        grid.append(button);
      });
    } else {
      grid.className = 'date-grid date-days';
      WEEKDAYS.forEach(value => {
        const heading = document.createElement('span');
        heading.className = 'date-weekday';
        heading.textContent = value;
        grid.append(heading);
      });
      const offset = (new Date(year, month, 1).getDay() + 6) % 7;
      for (let index = 0; index < offset; index++) grid.append(document.createElement('span'));
      const count = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= count; day++) {
        const iso = year + '-' + padDate(month + 1) + '-' + padDate(day);
        const selected = previous === iso;
        const button = dateButton(String(day), day + ' ' + MONTHS[month] + ' ' + year, () => choose(iso), selected ? 'selected' : '');
        button.setAttribute('aria-pressed', String(selected));
        grid.append(button);
      }
    }
  }
  render();
}
function enhanceCalendarFields(form) {
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
    input.addEventListener('click', () => openCalendar(input));
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCalendar(input);
      }
    });
  }
}
const calendarObserver = new MutationObserver(() => {
  const form = document.querySelector('#edit-form');
  if (form) enhanceCalendarFields(form);
  if (calendarActive && !calendarActive.input.isConnected) closeCalendar();
});
calendarObserver.observe(document.querySelector('#dialog'), { childList: true, subtree: true });
