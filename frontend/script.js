let selectedSeatId = null;
let currentSeats = [];

// Carica impostazioni e posti
async function loadSettingsAndSeats() {
  try {
    const settingsRes = await fetch('/api/settings');
    const settings = await settingsRes.json();

    const seatsRes = await fetch('/api/seats');
    const seats = await seatsRes.json();

    const logoEl = document.getElementById('logo');
    if (logoEl) logoEl.src = settings.logo_url || 'logo.png';

    renderGrid(settings.num_rows, settings.num_cols, seats);

    // Salva lo stato attuale dei posti per confronto futuro
    currentSeats = seats;
  } catch (err) {
    console.error('Errore nel caricamento:', err);
  }
}

// Renderizza la griglia in modo intelligente (aggiorna solo i posti cambiati)
function renderGrid(rows, cols, seats) {
  const grid = document.getElementById('grid');
  if (!grid) return;

  grid.style.gridTemplateColumns = `repeat(${cols}, 50px)`;

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const seat = seats.find(s => s.row_num === r && s.col_num === c);
      const seatId = seat ? `seat-${seat.id}` : `empty-${r}-${c}`;
      let div = document.getElementById(seatId);

      if (!div) {
        div = document.createElement('div');
        div.id = seatId;
        div.className = 'seat';
        div.style.width = '50px';
        div.style.height = '50px';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.fontWeight = 'bold';
        div.style.borderRadius = '5px';
        grid.appendChild(div);
      }

      if (seat) {
        div.textContent = seat.seat_number;
        div.className = `seat ${seat.status}`;
        div.onclick = seat.status === 'available' ? () => openForm(seat) : null;
      } else {
        div.textContent = '-';
        div.className = 'seat blocked';
        div.onclick = null;
      }
    }
  }
}

// Apri form laterale
function openForm(seat) {
  selectedSeatId = seat.id;
  document.getElementById('reservationForm').classList.add('active');
  document.getElementById('name').value = '';
  document.getElementById('surname').value = '';
  document.getElementById('phone').value = '';
}

// Chiudi form
function closeForm() {
  selectedSeatId = null;
  document.getElementById('reservationForm').classList.remove('active');
}

// Invia prenotazione dal form
async function submitReservation() {
  const name = document.getElementById('name').value.trim();
  const surname = document.getElementById('surname').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!name || !surname || !phone) {
    alert('Compila tutti i campi!');
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
      alert('Prenotazione effettuata!');
      closeForm();
      loadSettingsAndSeats();
    } else {
      alert(data.error || 'Errore nella prenotazione');
      loadSettingsAndSeats(); // aggiorna subito la griglia se il posto è stato prenotato da qualcun altro
      closeForm();
    }
  } catch (err) {
    console.error('Errore prenotazione:', err);
    alert('Errore nella prenotazione');
  }
}

// Polling automatico ogni X millisecondi
function startPolling(interval = 1000) {
  setInterval(async () => {
    try {
      const seatsRes = await fetch('/api/seats');
      const seats = await seatsRes.json();

      // Aggiorna solo se c'è differenza rispetto allo stato corrente
      if (JSON.stringify(seats) !== JSON.stringify(currentSeats)) {
        renderGrid(currentSeats[0]?.num_rows || 6, currentSeats[0]?.num_cols || 10, seats);
        currentSeats = seats;
      }
    } catch (err) {
      console.error('Errore nel polling:', err);
    }
  }, interval);
}

// Avvio pagina
window.onload = () => {
  loadSettingsAndSeats();
  startPolling(); 
};
