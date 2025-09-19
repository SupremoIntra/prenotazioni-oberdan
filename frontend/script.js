let selectedSeatId = null;
let currentSeats = [];
let currentEventId = 1;
let currentRows = 6;
let currentCols = 10;

// Carica griglia per un evento specifico
async function loadSettingsAndSeats(eventId = currentEventId) {
  try {
    const settingsRes = await fetch('/api/settings');
    const settings = await settingsRes.json();

    const seatsRes = await fetch(`/api/seats/${eventId}`);
    const seats = await seatsRes.json();

    const logoEl = document.getElementById('logo');
    if (logoEl) logoEl.src = settings.logo_url || 'logo.png';

    const rows = settings.num_rows || 6;
    const cols = settings.num_cols || 10;

    // aggiorno dimensioni correnti per il polling
    currentRows = rows;
    currentCols = cols;

    renderGrid(rows, cols, seats);
    currentSeats = seats;

  } catch (err) {
    console.error('Errore nel caricamento:', err);
  }
}

// Renderizza la griglia
function renderGrid(rows, cols, seats) {
  const grid = document.getElementById('grid');
  if (!grid) return;

  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, 50px)`;
  grid.style.gap = '5px';
  grid.innerHTML = '';

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const seat = seats.find(s => s.row_num === r && s.col_num === c);
      const div = document.createElement('div');
      div.className = 'seat';
      div.style.cursor = seat && seat.status === 'available' ? 'pointer' : 'not-allowed';

      if (seat) {
        div.id = `seat-${seat.id}`;
        div.textContent = seat.seat_number;
        div.classList.add(seat.status); // 'available', 'reserved', ecc.
        div.title = seat.status === 'reserved' ? `${seat.name} ${seat.surname}` : 'Libero';
        if (seat.status === 'available') div.onclick = () => openForm(seat);
      } else {
        div.textContent = '-';
        div.classList.add('blocked');
        div.title = 'Non disponibile';
      }

      grid.appendChild(div);
    }
  }
}

// Form
function openForm(seat) {
  if (seat.status !== 'available') {
    alert('Questo posto non è disponibile!');
    return;
  }
  selectedSeatId = seat.id;
  document.getElementById('reservationForm').classList.add('active');
  document.getElementById('name').value = '';
  document.getElementById('surname').value = '';
  document.getElementById('phone').value = '';
}

function closeForm() {
  selectedSeatId = null;
  document.getElementById('reservationForm').classList.remove('active');
}

// Prenotazione
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
      await loadSettingsAndSeats(currentEventId); // ricarica la griglia dal server
      closeForm();
    } else {
      alert(data.error || 'Errore nella prenotazione');
      await loadSettingsAndSeats(currentEventId);
      closeForm();
    }
  } catch (err) {
    console.error('Errore prenotazione:', err);
    alert('Errore nella prenotazione');
  }
}

// Polling per aggiornamenti in tempo reale
function startPolling(interval = 1000) {
  setInterval(async () => {
    try {
      const seatsRes = await fetch(`/api/seats/${currentEventId}`);
      const seats = await seatsRes.json();
      if (JSON.stringify(seats) !== JSON.stringify(currentSeats)) {
        // usa le dimensioni correnti lette dalle impostazioni
        renderGrid(currentRows || 6, currentCols || 10, seats);
        currentSeats = seats;
      }
    } catch (err) {
      console.error('Errore nel polling:', err);
    }
  }, interval);
}

// Carica eventi e popola tendina
async function loadEvents() {
  try {
    const select = document.getElementById('eventSelect');
    select.innerHTML = '';
    // Genero solo 6 openday puliti (Open Day 1..6)
    for (let i = 1; i <= 6; i++) {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `Open Day ${i}`;
      select.appendChild(option);
    }
    currentEventId = select.value;
    await loadSettingsAndSeats(currentEventId);
  } catch (err) {
    console.error('Errore caricamento eventi:', err);
  }
}

// Evento cambio open day
async function loadSelectedEvent() {
  currentEventId = document.getElementById('eventSelect').value;
  await loadSettingsAndSeats(currentEventId);
}

// Avvio pagina
window.onload = () => {
  (async () => {
    await loadEvents();
    startPolling();
  })();
};
