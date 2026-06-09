// ============================================================================
//  API REST - Gestion de tâches (todo-list)
//  Node.js + Express + MariaDB (via mysql2, avec pool de connexions)
//  --------------------------------------------------------------------------
//  NB : le code applicatif n'est volontairement PAS le coeur du projet.
//  Le seul point "Docker" intéressant ici est la LOGIQUE DE RETRY au
//  démarrage : la base de données peut mettre quelques secondes à être prête,
//  on ré-essaie donc la connexion plusieurs fois avant d'abandonner.
// ============================================================================

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json()); // parse le corps JSON des requêtes POST/PUT

// --- Configuration lue depuis les variables d'environnement -----------------
// Toutes ces valeurs sont injectées par docker-compose (voir docker-compose.yml).
// On fournit des valeurs par défaut pour pouvoir lancer le code hors Docker.
const PORT = process.env.PORT || 3000;

const dbConfig = {
  host: process.env.DB_HOST || 'db',          // "db" = nom du service MariaDB dans compose (résolu par le DNS Docker)
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'todo_user',
  password: process.env.DB_PASSWORD || 'todo_password',
  database: process.env.DB_NAME || 'todo_db',
  waitForConnections: true,
  connectionLimit: 10,   // taille du pool : 10 connexions réutilisables
  queueLimit: 0,
};

let pool; // pool de connexions partagé par toutes les routes

// --- Connexion à la base avec logique de RETRY ------------------------------
// Même si docker-compose attend que la base soit "healthy" (depends_on +
// condition: service_healthy), on garde cette boucle de robustesse : c'est une
// bonne pratique et ça illustre que le réseau Docker peut ne pas être prêt
// instantanément.
async function initDb(retries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      pool = mysql.createPool(dbConfig);
      const conn = await pool.getConnection();
      await conn.ping();      // vérifie que la base répond réellement
      conn.release();
      console.log(`[DB] Connecté à MariaDB sur ${dbConfig.host}:${dbConfig.port} (base "${dbConfig.database}")`);
      return;
    } catch (err) {
      console.error(`[DB] Tentative ${attempt}/${retries} échouée : ${err.code || err.message}`);
      if (attempt === retries) {
        console.error('[DB] Connexion impossible après plusieurs essais. Arrêt du processus.');
        process.exit(1); // le conteneur s'arrête -> restart: unless-stopped le relancera
      }
      // on attend avant de réessayer (le temps que MariaDB finisse de démarrer)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// ============================================================================
//  ROUTES DE L'API
// ============================================================================

// --- Healthcheck : utilisé par Docker (healthcheck du service backend) ------
// Renvoie 200 si l'API tourne ET que la base répond (SELECT 1).
// C'est ce endpoint qui prouve que le backend parle bien à la base.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

// --- Lister toutes les tâches -----------------------------------------------
app.get('/api/tasks', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, done, created_at FROM tasks ORDER BY created_at DESC, id DESC');
    // mysql2 renvoie le BOOLEEN (tinyint) comme 0/1 -> on le convertit en true/false
    res.json(rows.map((t) => ({ ...t, done: Boolean(t.done) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Créer une tâche --------------------------------------------------------
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

// --- Mettre à jour une tâche (titre et/ou statut "done") --------------------
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

// --- Supprimer une tâche ----------------------------------------------------
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tâche introuvable.' });
    }
    res.status(204).send(); // 204 No Content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
//  DÉMARRAGE : on attend la base, PUIS on écoute les requêtes HTTP
// ============================================================================
async function start() {
  await initDb();
  app.listen(PORT, () => console.log(`[API] Backend à l'écoute sur le port ${PORT}`));
}

start();
