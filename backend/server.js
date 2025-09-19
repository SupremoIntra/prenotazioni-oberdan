const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const pool = require('./db');

const app = express();

const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend")));

app.use(cors());
app.use(bodyParser.json());


app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// ---- SETTINGS ----
app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM settings WHERE id=1');
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', async (req, res) => {
  const { num_rows, num_cols, logo_url, color_primary } = req.body;
  try {
    await pool.query(
      'UPDATE settings SET num_rows=?, num_cols=?, logo_url=?, color_primary=? WHERE id=1',
      [num_rows, num_cols, logo_url, color_primary]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- SEATS ----
app.get('/api/seats', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM seats ORDER BY row_num, col_num');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reserve', async (req, res) => {
  const { seat_id, name, surname, phone } = req.body;
  if (!seat_id || !name || !surname || !phone) return res.status(400).json({ error: 'Dati mancanti' });

  try {
    const now = new Date();
    const [result] = await pool.query(
      `UPDATE seats SET status='reserved', reserved_name=?, reserved_surname=?, reserved_phone=?, reserved_at=? 
       WHERE id=? AND status='available'`,
      [name, surname, phone, now, seat_id]
    );
    if (result.affectedRows === 0) return res.status(409).json({ error: 'Posto non disponibile' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cancel/:id', async (req, res) => {
  const seatId = req.params.id;
  try {
    const [result] = await pool.query(
      `UPDATE seats SET status='available', reserved_name=NULL, reserved_surname=NULL, reserved_phone=NULL, reserved_at=NULL 
       WHERE id=?`,
      [seatId]
    );
    res.json({ success: result.affectedRows > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lista eventi
app.get('/api/events', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM events');
  res.json(rows);
});

// Posti di un evento
app.get('/api/seats/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  const [rows] = await pool.query('SELECT * FROM seats WHERE event_id = ? ORDER BY row_num, col_num', [eventId]);
  res.json(rows);
});

// Prenotazione per un evento
app.post('/api/reserve/:eventId', async (req, res) => {
  const { seat_id, name, surname, phone } = req.body;
  const eventId = req.params.eventId;

  const [result] = await pool.query(
    `UPDATE seats SET status='reserved', reserved_name=?, reserved_surname=?, reserved_phone=?, reserved_at=NOW() 
     WHERE id=? AND status='available' AND event_id=?`,
    [name, surname, phone, seat_id, eventId]
  );
  if (result.affectedRows === 0) return res.status(409).json({ error: 'Posto non disponibile' });
  res.json({ success: true });
});

// ---- CANCEL VERIFY (nome + cognome + telefono) ----
app.post('/api/cancel-verify', async (req, res) => {
  const { name, surname, phone, event_id } = req.body;
  if (!name || !surname || !phone) return res.status(400).json({ success: false, error: 'Campi mancanti' });

  try {
    // normalizza input semplicemente (trim)
    const n = name.trim();
    const s = surname.trim();
    const p = phone.trim();

    // trova la prenotazione corrispondente (eventuale) - cerca sul massimo di un record
    const [rows] = await pool.query(
      `SELECT id FROM seats 
       WHERE reserved_name = ? AND reserved_surname = ? AND reserved_phone = ?` + (event_id ? ' AND event_id = ?' : '') + ' LIMIT 1',
      event_id ? [n, s, p, event_id] : [n, s, p]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Prenotazione non trovata' });
    }

    const seatId = rows[0].id;

    const [result] = await pool.query(
      `UPDATE seats SET status='available', reserved_name=NULL, reserved_surname=NULL, reserved_phone=NULL, reserved_at=NULL 
       WHERE id = ?`,
      [seatId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({ success: false, error: 'Impossibile annullare la prenotazione' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('cancel-verify error', err);
    return res.status(500).json({ success: false, error: 'Errore interno' });
  }
});

// ---- START ----
const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));
