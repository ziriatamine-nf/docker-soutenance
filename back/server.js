const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json()); 


const PORT = process.env.PORT || 3000;

const dbConfig = {
  host: process.env.DB_HOST || 'db',        
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'todo_user',
  password: process.env.DB_PASSWORD || 'todo_password',
  database: process.env.DB_NAME || 'todo_db',
  waitForConnections: true,
  connectionLimit: 10,   
  queueLimit: 0,
};

let pool; 


async function initDb(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = mysql.createPool(dbConfig);
      const conn = await pool.getConnection();
      await conn.ping();     
      conn.release();
      console.log(`[DB] Connecté à MariaDB sur ${dbConfig.host}:${dbConfig.port} (base "${dbConfig.database}")`);
      return;
    } catch (err) {
      console.error(`[DB] Tentative ${attempt}/${retries} échouée : ${err.code || err.message}`);
      if (attempt === retries) {
        console.error('[DB] Connexion impossible après plusieurs essais. Arrêt du processus.');
        process.exit(1); 
      }
    
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}


app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});


app.get('/api/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, done, created_at FROM tasks ORDER BY created_at DESC, id DESC');
  
    res.json(rows.map((t) => ({ ...t, done: Boolean(t.done) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.post('/api/tasks', async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Le champ "title" est requis.' });
  }
  try {
    const [result] = await pool.query('INSERT INTO tasks (title) VALUES (?)', [title.trim()]);
    const [rows] = await pool.query('SELECT id, title, done, created_at FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json({ ...rows[0], done: Boolean(rows[0].done) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.put('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { title, done } = req.body;
  try {
    const [existing] = await pool.query('SELECT id, title, done FROM tasks WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Tâche introuvable.' });
    }
    const newTitle = title !== undefined ? title : existing[0].title;
    const newDone = done !== undefined ? (done ? 1 : 0) : existing[0].done;
    await pool.query('UPDATE tasks SET title = ?, done = ? WHERE id = ?', [newTitle, newDone, id]);
    const [rows] = await pool.query('SELECT id, title, done, created_at FROM tasks WHERE id = ?', [id]);
    res.json({ ...rows[0], done: Boolean(rows[0].done) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tâche introuvable.' });
    }
    res.status(204).send(); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`[API] Backend à l'écoute sur le port ${PORT}`));
}

start();
