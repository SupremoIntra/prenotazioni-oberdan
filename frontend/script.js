let selectedSeatId = null;
let currentSeats = [];
let currentEventId = 1;
let currentRows = 6;
let currentCols = 10;
let pollingId = null;

// Carica griglia per un evento specifico
async function loadSettingsAndSeats(eventId = currentEventId) {
  try {
    const settingsRes = await fetch('/api/settings');
    const settings = settingsRes.ok ? await settingsRes.json() : {};
    const seatsRes = await fetch(`/api/seats/${eventId}`);
    const seats = seatsRes.ok ? await seatsRes.json() : [];

    const logoEl = document.getElementById('logo');
    if (logoEl) logoEl.src = settings.logo_url || 'logo.png';

    const rows = Number(settings.num_rows) || 6;
    const cols = Number(settings.num_cols) || 10;

    currentRows = rows;
    currentCols = cols;

    renderGrid(rows, cols, seats || []);
    currentSeats = seats || [];
  } catch (err) {
    console.error('Errore nel caricamento:', err);
  }
}

// Renderizza la griglia (senza pill sotto, solo tooltip nero a scomparsa)
function renderGrid(rows, cols, seats) {
  const grid = document.getElementById('grid');
  if (!grid) return;

  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, 50px)`;
  grid.style.gap = '5px';
  grid.innerHTML = '';

  const seatList = seats || [];

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const seat = seatList.find(s => Number(s.row_num) === r && Number(s.col_num) === c);
      const div = document.createElement('div');
      div.className = 'seat';
      div.style.cursor = (seat && seat.status === 'available') ? 'pointer' : 'not-allowed';
      div.style.position = 'relative';

      // numero del posto (visibile, sempre sopra)
      const numSpan = document.createElement('span');
      numSpan.className = 'seat-number';
      numSpan.textContent = seat ? (seat.seat_number ?? `${r}-${c}`) : '-';
      div.appendChild(numSpan);

      // Mantieni solo tooltip (data-info) che appare in alto al hover
      if (seat) {
        const status = seat.status ?? 'blocked';
        div.classList.add(status);

        if (status === 'reserved') {
          div.dataset.info = `Prenotato`; // tooltip breve e pulito, senza nome
          div.onclick = null;
        } else if (status === 'available') {
          div.dataset.info = 'Libero';
          div.onclick = () => openForm(seat);
        } else {
          div.dataset.info = status;
          div.onclick = null;
        }
      } else {
        div.classList.add('blocked');
        div.dataset.info = 'Non disponibile';
        div.onclick = null;
      }

      grid.appendChild(div);
    }
  }
}

// Apri form laterale per prenotare (solo posti disponibili)
function openForm(seat) {
  if (!seat || seat.status !== 'available') {
    alert('Questo posto non è disponibile!');
    return;
  }
  selectedSeatId = seat.id;
  const form = document.getElementById('reservationForm');
  if (!form) return;
  form.classList.add('active');
  document.getElementById('name').value = '';
  document.getElementById('surname').value = '';
  document.getElementById('phone').value = '';
}

// Chiudi form
function closeForm() {
  selectedSeatId = null;
  const form = document.getElementById('reservationForm');
  if (!form) return;
  form.classList.remove('active');
}

// Invia prenotazione al server
async function submitReservation() {
  if (!selectedSeatId) { alert('Seleziona un posto!'); return; }

  const name = document.getElementById('name').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const phone = document.getElementById('phone').value.trim();
  if (!name || !surname || !phone) { alert('Compila tutti i campi!'); return; }

  try {
    const res = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seat_id: selectedSeatId, name, surname, phone })
    });
    const data = await res.json();

    if (data.success) {
      alert('Prenotazione effettuata!');
    } else {
      alert(data.error || 'Errore nella prenotazione');
    }
    await loadSettingsAndSeats(currentEventId);
    closeForm();
  } catch (err) {
    console.error('Errore prenotazione:', err);
    alert('Errore nella prenotazione');
    await loadSettingsAndSeats(currentEventId);
    closeForm();
  }
}

// Polling per aggiornamenti in tempo reale (usa dimensioni correnti)
function startPolling(interval = 1000) {
  if (pollingId) clearInterval(pollingId);
  pollingId = setInterval(async () => {
    try {
      const seatsRes = await fetch(`/api/seats/${currentEventId}`);
      const seats = seatsRes.ok ? await seatsRes.json() : [];
      if (JSON.stringify(seats) !== JSON.stringify(currentSeats)) {
        renderGrid(currentRows || 6, currentCols || 10, seats || []);
        currentSeats = seats || [];
      }
    } catch (err) {
      console.error('Errore nel polling:', err);
    }
  }, interval);
}

// Carica eventi e popola tendina (6 Open Day come richiesto)
async function loadEvents() {
  try {
    const select = document.getElementById('eventSelect');
    if (!select) return;
    select.innerHTML = '';
    for (let i = 1; i <= 6; i++) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `Open Day ${i}`;
      select.appendChild(option);
    }
    select.selectedIndex = 0;
    currentEventId = select.value;
    await loadSettingsAndSeats(currentEventId);
  } catch (err) {
    console.error('Errore caricamento eventi:', err);
  }
}

// Cambio Open Day selezionato
async function loadSelectedEvent() {
  const sel = document.getElementById('eventSelect');
  if (!sel) return;
  currentEventId = sel.value;
  await loadSettingsAndSeats(currentEventId);
}

// Inizializzazione pagina
window.onload = () => {
  (async () => {
    await loadEvents();
    startPolling();
  })();
};