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

// ---- START ----
const PORT = 3000;
app.listen(PORT, () => console.log(`Server avviato su http://localhost:${PORT}`));