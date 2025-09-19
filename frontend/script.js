let selectedSeatId = null;
let currentSeats = [];
let currentEventId = 1;
let currentRows = 6;
let currentCols = 10;
let pollingId = null;

// Messaggi nel form (errori)
function showFormMessage(text, duration = 3000) {
  const msgEl = document.getElementById('formMessage');
  if (!msgEl) return;

  msgEl.textContent = text;
  msgEl.className = ''; // reset classi
  msgEl.classList.add('visible', 'error');

  setTimeout(() => {
    msgEl.classList.remove('visible', 'error');
    msgEl.textContent = '';
  }, duration);
}

// Messaggi globali (successi sotto la griglia)
function showGlobalMessage(text, duration = 3000) {
  const msgEl = document.getElementById('globalMessage');
  if (!msgEl) return;

  msgEl.textContent = text;
  msgEl.className = ''; // reset classi
  msgEl.classList.add('visible', 'success');

  setTimeout(() => {
    msgEl.classList.remove('visible', 'success');
    msgEl.textContent = '';
  }, duration);
}

// Carica griglia
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

// Renderizza griglia
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

      const numSpan = document.createElement('span');
      numSpan.className = 'seat-number';
      numSpan.textContent = seat ? (seat.seat_number ?? `${r}-${c}`) : '-';
      div.appendChild(numSpan);

      if (seat) {
        const status = seat.status ?? 'blocked';
        div.classList.add(status);

        if (status === 'reserved') {
          div.dataset.info = `Prenotato`;
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

// Apri form
function openForm(seat) {
  if (!seat || seat.status !== 'available') {
    showFormMessage('Questo posto non è disponibile!', 3000);
    return;
  }
  selectedSeatId = seat.id;
  const form = document.getElementById('reservationForm');
  if (!form) return;
  form.classList.add('active');
  document.getElementById('name').value = '';
  document.getElementById('surname').value = '';
  document.getElementById('phone').value = '';
  document.getElementById('privacyConsent').checked = false;
}

// Chiudi form
function closeForm() {
  selectedSeatId = null;
  const form = document.getElementById('reservationForm');
  if (!form) return;
  form.classList.remove('active');
}

// Invia prenotazione
async function submitReservation() {
  if (!selectedSeatId) { 
    showFormMessage('Seleziona un posto!');
    return; 
  }

  const name = document.getElementById('name').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const privacyConsent = document.getElementById('privacyConsent').checked;

  if (!name || !surname || !phone) {
    showFormMessage('Compila tutti i campi!');
    return;
  }

  if (!privacyConsent) {
    showFormMessage('Devi accettare il trattamento dei dati per procedere.');
    return;
  }

  try {
    const res = await fetch('/api/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seat_id: selectedSeatId, name, surname, phone })
    });
    const data = await res.json();

    if (data.success) {
      showGlobalMessage('Prenotazione effettuata con successo!', 3000);
    } else {
      showFormMessage(data.error || 'Errore nella prenotazione');
    }
    await loadSettingsAndSeats(currentEventId);
    closeForm();
  } catch (err) {
    console.error('Errore prenotazione:', err);
    showFormMessage('Errore nella prenotazione');
    await loadSettingsAndSeats(currentEventId);
    closeForm();
  }
}

// Polling
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

// Carica eventi
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

// Cambio evento
async function loadSelectedEvent() {
  const sel = document.getElementById('eventSelect');
  if (!sel) return;
  currentEventId = sel.value;
  await loadSettingsAndSeats(currentEventId);
}



// apri/chiudi cancel form (non toccare altro)
function openCancelForm() {
  const f = document.getElementById('cancelForm');
  if (!f) return;
  f.style.right = '20px';
  f.setAttribute('aria-hidden','false');
  document.getElementById('cancelMessage').textContent = '';
}
function closeCancelForm() {
  const f = document.getElementById('cancelForm');
  if (!f) return;
  f.style.right = '-360px';
  f.setAttribute('aria-hidden','true');
}

// invia richiesta di cancellazione basata su nome/cognome/telefono
async function submitCancelByDetails() {
  const name = (document.getElementById('cancel_name').value || '').trim();
  const surname = (document.getElementById('cancel_surname').value || '').trim();
  const phone = (document.getElementById('cancel_phone').value || '').trim();
  const msgEl = document.getElementById('cancelMessage');

  if (!name || !surname || !phone) {
    msgEl.style.color = '#b00020';
    msgEl.textContent = 'Compila tutti i campi.';
    return;
  }

  try {
    const res = await fetch('/api/cancel-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, surname, phone, event_id: currentEventId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      msgEl.style.color = '#0a7a07';
      msgEl.textContent = 'Prenotazione annullata.';
      // ricarica griglia
      await loadSettingsAndSeats(currentEventId);
      setTimeout(closeCancelForm, 900);
    } else {
      msgEl.style.color = '#b00020';
      msgEl.textContent = data.error || 'Prenotazione non trovata.';
    }
  } catch (err) {
    console.error(err);
    msgEl.style.color = '#b00020';
    msgEl.textContent = 'Errore server.';
  }
}

// Inizializzazione
window.onload = () => {
  (async () => {
    await loadEvents();
    startPolling();
  })();
};
