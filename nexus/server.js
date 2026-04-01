require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const bodyParser = require("body-parser");
const mysql      = require("mysql2");
const path       = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Auto-detect MySQL password ────────────────────────────────────────────────
// Tries the .env password first, then common defaults, so the app works
// regardless of which password the user set during MySQL installation.
const PASSWORDS_TO_TRY = [
  process.env.DB_PASSWORD ?? "",   // .env value first
  "",                               // blank (many default installs)
  "root",
  "root1234",
  "password",
  "admin",
  "123456",
  "mysql",
];

let db = null;

async function tryConnect(password) {
  return new Promise((resolve) => {
    const pool = mysql.createPool({
      host:               process.env.DB_HOST || "localhost",
      user:               process.env.DB_USER || "root",
      password:           password,
      database:           process.env.DB_NAME || "terraweather",
      port:               process.env.DB_PORT || 3306,
      waitForConnections: true,
      connectionLimit:    10,
      queueLimit:         0,
    });
    const p = pool.promise();
    p.query("SELECT 1")
      .then(() => resolve({ pool: p, password }))
      .catch(() => resolve(null));
  });
}

async function initDB() {
  // Try each password until one works
  for (const pwd of PASSWORDS_TO_TRY) {
    const result = await tryConnect(pwd);
    if (result) {
      db = result.pool;
      const displayPwd = pwd === "" ? "(blank)" : pwd;
      console.log(`Connected to MySQL successfully! (password: ${displayPwd})`);
      // Auto-create tables
      await db.query(`CREATE TABLE IF NOT EXISTS searches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        city VARCHAR(100) NOT NULL,
        temp FLOAT,
        description VARCHAR(200),
        searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        city VARCHAR(100) UNIQUE NOT NULL,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      console.log("Tables ready.");
      return true;
    }
  }
  // No password worked — app still runs but DB features disabled
  console.warn("⚠️  Could not connect to MySQL with any known password.");
  console.warn("⚠️  Weather search still works. Recent searches & favourites disabled.");
  console.warn("⚠️  Fix: open .env and set DB_PASSWORD= to your MySQL root password.");
  return false;
}

// ── Helper: send graceful error if DB not connected ───────────────────────────
function dbRequired(res) {
  res.status(503).json({ error: "Database not connected. Check DB_PASSWORD in .env" });
}

// ── API Endpoints ─────────────────────────────────────────────────────────────

app.get("/api/searches", async (req, res) => {
  if (!db) return dbRequired(res);
  try {
    const [rows] = await db.query(
      `SELECT city, MAX(temp) AS temp, MAX(description) AS description, MAX(searched_at) AS searched_at
       FROM searches GROUP BY city ORDER BY MAX(searched_at) DESC LIMIT 20`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/searches", async (req, res) => {
  if (!db) return dbRequired(res);
  const { city, temp, description } = req.body;
  if (!city) return res.status(400).json({ error: "City required." });
  try {
    const [result] = await db.query(
      "INSERT INTO searches (city, temp, description) VALUES (?, ?, ?)",
      [city, temp ?? null, description ?? null]
    );
    res.json({ id: result.insertId, city, temp, description });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/searches", async (req, res) => {
  if (!db) return dbRequired(res);
  try {
    await db.query("DELETE FROM searches");
    res.json({ message: "History cleared." });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/favorites", async (req, res) => {
  if (!db) return dbRequired(res);
  try {
    const [rows] = await db.query("SELECT * FROM favorites ORDER BY added_at DESC");
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/favorites", async (req, res) => {
  if (!db) return dbRequired(res);
  const { city } = req.body;
  if (!city) return res.status(400).json({ error: "City required." });
  try {
    const [result] = await db.query(
      "INSERT IGNORE INTO favorites (city) VALUES (?)",
      [city]
    );
    res.json({ id: result.insertId, city });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("/api/favorites/:city", async (req, res) => {
  if (!db) return dbRequired(res);
  try {
    await db.query("DELETE FROM favorites WHERE city = ?", [req.params.city]);
    res.json({ deleted: req.params.city });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/api/stats", async (req, res) => {
  if (!db) return dbRequired(res);
  try {
    const [[countRow]] = await db.query("SELECT COUNT(*) AS total FROM searches");
    const [[topRow]]   = await db.query(
      "SELECT city FROM searches GROUP BY city ORDER BY COUNT(*) DESC LIMIT 1"
    );
    res.json({ total: countRow.total, top_city: topRow?.city || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log("TerraWeather running at http://localhost:" + PORT);
  });
});
