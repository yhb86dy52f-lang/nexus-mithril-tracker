const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'nexus.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS posiciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device TEXT NOT NULL,
  nombre TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  velocidad REAL DEFAULT 0,
  temperatura REAL,
  vibracion REAL,
  bateria_v REAL,
  rpm INTEGER,
  rssi INTEGER,
  voltaje REAL,
  estado_sensores TEXT,
  fuente TEXT DEFAULT 'personal',
  timestamp TEXT NOT NULL,
  raw TEXT
);
CREATE INDEX IF NOT EXISTS idx_pos_device ON posiciones(device);
  CREATE TABLE IF NOT EXISTS raw_sms (id INTEGER PRIMARY KEY AUTOINCREMENT, device TEXT NOT NULL, texto TEXT NOT NULL, timestamp TEXT NOT NULL);
`);

// Migracion suave: si la tabla ya existe sin columna raw, la agrega sin borrar datos
try {
  const cols = db.prepare(`PRAGMA table_info(posiciones)`).all().map((c) => c.name);
  if (!cols.includes('raw')) {
    db.exec(`ALTER TABLE posiciones ADD COLUMN raw TEXT`);
  }
} catch (e) { /* tabla nueva, ya tiene raw en CREATE si se recrea */ }

db.exec(`
`);

db.exec(`
CREATE TABLE IF NOT EXISTS geofence_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL,
  geofence_id TEXT NOT NULL,
  geofence_nombre TEXT,
  tipo TEXT NOT NULL,
  lat REAL,
  lon REAL,
  timestamp TEXT NOT NULL
);
`);

function saveTelemetry(d) {
  const stmt = db.prepare(`
    INSERT INTO posiciones (device, nombre, lat, lon, velocidad, temperatura, vibracion, bateria_v, rpm, rssi, voltaje, estado_sensores, fuente, timestamp, raw)
    VALUES (@device, @nombre, @lat, @lon, @velocidad, @temperatura, @vibracion, @bateria_v, @rpm, @rssi, @voltaje, @estado_sensores, @fuente, @timestamp, @raw)
  `);
  return stmt.run({
    device: d.device, nombre: d.nombre || d.device,
    lat: d.lat, lon: d.lon,
    velocidad: d.velocidad || 0,
    temperatura: d.temperatura ?? null,
    vibracion: d.vibracion ?? null,
    bateria_v: d.bateria_v ?? null,
    rpm: d.rpm ?? null,
    rssi: d.rssi ?? null,
    voltaje: d.voltaje ?? d.bateria_v ?? null,
    estado_sensores: d.estado_sensores ?? null,
    fuente: d.fuente || 'personal',
    timestamp: d.timestamp || new Date().toISOString(),
    raw: d.raw ?? d.mensaje ?? d.sms ?? null
  });
}

function insertGpsPosition(data) {
    return saveTelemetry({
        device: data.device, nombre: data.nombre || data.device,
        lat: data.lat, lon: data.lon,
        velocidad: data.velocidad || 0,
        temperatura: data.temperatura ?? null,
        rssi: data.rssi ?? null,
        voltaje: data.voltaje ?? null,
        estado_sensores: data.estado_sensores ?? null,
        fuente: data.fuente || 'sms',
        timestamp: new Date().toISOString(),
        raw: data.raw ?? data.mensaje ?? data.sms ?? null
    });
}

function getLatestPositions() {
  return db.prepare(`SELECT * FROM posiciones WHERE id IN (SELECT MAX(id) FROM posiciones GROUP BY device) ORDER BY timestamp DESC`).all();
}

function getHistory(device, limit = 100) {
  const lim = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(10000, parseInt(limit, 10))) : 100;
  const dev = device ? String(device).trim() : null;
  if (dev) return db.prepare(`SELECT * FROM posiciones WHERE device = ? ORDER BY id DESC LIMIT ?`).all(dev, lim);
  return db.prepare(`SELECT * FROM posiciones ORDER BY id DESC LIMIT ?`).all(lim);
}

function saveGeofenceEvent(e) {
  return db.prepare(`INSERT INTO geofence_events (device_id, geofence_id, geofence_nombre, tipo, lat, lon, timestamp) VALUES (@device_id, @geofence_id, @geofence_nombre, @tipo, @lat, @lon, @timestamp)`).run({
    device_id: e.device_id || e.deviceId,
    geofence_id: e.geofence_id || e.geofence,
    geofence_nombre: e.geofence_nombre || e.nombre,
    tipo: e.tipo,
    lat: e.lat || 0,
    lon: e.lon || 0,
    timestamp: e.timestamp || new Date().toISOString()
  });
}


function saveRawSMS(device, texto) {
  const stmt = db.prepare('INSERT INTO raw_sms (device, texto, timestamp) VALUES (?, ?, ?)');
  return stmt.run(device, texto, new Date().toISOString());
}

function getRawSMS(device, limit = 100) {
  return db.prepare('SELECT * FROM raw_sms WHERE device = ? ORDER BY id DESC LIMIT ?').all(device, limit);
}

module.exports = { saveRawSMS, getRawSMS, db, saveTelemetry, insertGpsPosition, getLatestPositions, getHistory, saveGeofenceEvent };