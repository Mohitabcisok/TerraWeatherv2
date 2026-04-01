# ⛅ TerraWeather v9.0 — India Weather Intelligence Platform

> Professional weather dashboard with live AQI (India CPCB standard), 5-day forecast, 20 city monitoring, and alert system.

---

## 🚀 SETUP GUIDE — Read Before Running

---

## STEP 1 — MySQL Workbench Setup

### 1A. Open MySQL Workbench
- Launch **MySQL Workbench** from your Start Menu
- Click your connection (usually called "Local instance MySQL80" or similar)
- Enter your root password when prompted

### 1B. Create the Database
Click the **SQL Editor** tab and type exactly this, then press the ⚡ (Execute) button:

```sql
CREATE DATABASE IF NOT EXISTS terraweather;
```

✅ You should see: `1 row(s) affected` in the Output panel

### 1C. Verify it worked
```sql
SHOW DATABASES;
```
You should see `terraweather` in the list.

> ℹ️ Tables (`searches`, `favorites`) are auto-created by the server when it starts. You don't need to create them manually.

---

## STEP 2 — Configure Your Database Password

Open the `.env` file inside the `nexus` folder using **Notepad** or **VS Code**.

Change `DB_PASSWORD` to match your MySQL root password:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD_HERE   ← change this
DB_NAME=terraweather
DB_PORT=3306
PORT=3000
```

**Common passwords people set during MySQL install:**
- `root`
- `root1234`
- `password`
- `admin`
- (blank — just leave DB_PASSWORD= empty)

---

## STEP 3 — Install Node.js Packages

> ⚠️ This is the fix for the error: `Cannot find module 'dotenv'`

Open **PowerShell** or **Command Prompt** inside the `nexus` folder.

**How to open PowerShell in the nexus folder:**
1. Open the `nexus` folder in File Explorer
2. Click the address bar at the top
3. Type `powershell` and press Enter
4. PowerShell opens directly in that folder ✅

Now run this command:
```
npm install
```

Wait for it to finish. You'll see it download packages like:
```
added 87 packages in 12s
```

This creates a `node_modules` folder. You only need to do this **once**.

---

## STEP 4 — Start the Server

In the same PowerShell window, run:
```
node server.js
```

✅ **Success looks like this:**
```
Connected to MySQL successfully!
Tables ready.
TerraWeather v9.0 running at http://localhost:3000
```

❌ **If you see MySQL errors, check:**
| Error Message | Fix |
|---|---|
| `Access denied for user 'root'` | Wrong password in `.env` — fix DB_PASSWORD |
| `Unknown database 'terraweather'` | Run `CREATE DATABASE IF NOT EXISTS terraweather;` in Workbench |
| `ECONNREFUSED` | MySQL service isn't running — open Services and start MySQL80 |
| `EADDRINUSE: port 3000` | Port taken — change `PORT=3001` in `.env` |

---

## STEP 5 — Open the App

Open your browser and go to:
```
http://localhost:3000
```

The full app loads with Dashboard, Forecast, India Cities, and Alert Center.

---

## ⚡ QUICK START (Windows One-Click)

It automatically runs `npm install` then `node server.js`.

---

## 🔧 Verify MySQL from Workbench (after running)

After the server starts, go back to MySQL Workbench and run:
```sql
USE terraweather;
SHOW TABLES;
SELECT * FROM searches ORDER BY searched_at DESC LIMIT 10;
```
You'll see your recent city searches stored there. This powers the **Recent Searches** panel on the Dashboard.

---

## 📁 Project Structure

```
nexus/
├── server.js           ← Express + MySQL backend (Node.js)
├── package.json        ← Dependencies list
├── .env                ← Your DB credentials (edit this!)
├── README.md           ← This file
└── public/
    ├── index.html      ← Dashboard
    ├── forecast.html   ← 5-day + hourly forecast
    ├── cities.html     ← 20 Indian cities grid
    ├── alerts.html     ← Alert center + AQI breakdown
    ├── css/style.css   ← All styling (v7 Professional theme)
    ├── js/app.js       ← All JavaScript logic
    └── manifest.json   ← PWA manifest
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3 (custom design), Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | MySQL (via mysql2 + connection pool) |
| Weather API | OpenWeatherMap (Current + Forecast + AQI) |
| AQI Standard | India CPCB (0-500 scale, max sub-index method) |
| Fonts | Exo 2 + Nunito + JetBrains Mono |

---

*TerraWeather v9.0 — Built for academic demonstration of full-stack development*
