const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'nexus.db'));

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
  fuente TEXT DEFAULT 'hubble',
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pos_device ON posiciones(device);
CREATE INDEX IF NOT EXISTS idx_pos_ts ON posiciones(timestamp);
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
CREATE INDEX IF NOT EXISTS idx_geo_device ON geofence_events(device_id);
`);

function ensureColumn(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
ensureColumn('posiciones', 'vibracion', 'REAL');
ensureColumn('posiciones', 'bateria_v', 'REAL');
ensureColumn('posiciones', 'rpm', 'INTEGER');
ensureColumn('posiciones', 'temperatura', 'REAL');
ensureColumn('posiciones', 'estado_sensores', 'TEXT');

function saveTelemetry(d) {
  const stmt = db.prepare(`
    INSERT INTO posiciones (device, nombre, lat, lon, velocidad, temperatura, vibracion, bateria_v, rpm, rssi, voltaje, estado_sensores, fuente, timestamp)
    VALUES (@device, @nombre, @lat, @lon, @velocidad, @temperatura, @vibracion, @bateria_v, @rpm, @rssi, @voltaje, @estado_sensores, @fuente, @timestamp)
  `);
  return stmt.run({
    device: d.device,
    nombre: d.nombre || d.device,
    lat: d.lat, lon: d.lon,
    velocidad: d.velocidad || 0,
    temperatura: d.temperatura ?? null,
    vibracion: d.vibracion ?? null,
    bateria_v: d.bateria_v ?? null,
    rpm: d.rpm ?? null,
    rssi: d.rssi ?? null,
    voltaje: d.voltaje ?? d.bateria_v ?? null,
    estado_sensores: d.estado_sensores ?? null,
    fuente: d.fuente || 'hubble',
    timestamp: d.timestamp || new Date().toISOString()
  });
}

// Puente de compatibilidad para gps_router.js (SMS)
function insertGpsPosition(data) {
    return saveTelemetry({
        device: data.device,
        nombre: data.device,
        lat: data.lat, lon: data.lon,
        velocidad: data.velocidad || 0,
        temperatura: data.temperatura ?? null,
        rssi: data.rssi ?? null,
        voltaje: data.voltaje ?? null,
        estado_sensores: data.estado_sensores ?? null,
        fuente: data.fuente || 'sms',
        timestamp: new Date().toISOString()
    });
}

function getLatestPositions() {
  return db.prepare(`SELECT * FROM posiciones WHERE id IN (SELECT MAX(id) FROM posiciones GROUP BY device) ORDER BY timestamp DESC`).all();
}

function getHistory(device, limit = 100) {
  if (device) return db.prepare(`SELECT * FROM posiciones WHERE device = ? ORDER BY id DESC LIMIT ?`).all(device, limit);
  return db.prepare(`SELECT * FROM posiciones ORDER BY id DESC LIMIT ?`).all(limit);
}

function saveGeofenceEvent(e) {
  return db.prepare(`INSERT INTO geofence_events (device_id, geofence_id, geofence_nombre, tipo, lat, lon, timestamp) VALUES (@device_id, @geofence_id, @geofence_nombre, @tipo, @lat, @lon, @timestamp)`).run(e);
}

function getGeofenceEvents(device, limit = 50) {
  if (device) return db.prepare(`SELECT * FROM geofence_events WHERE device_id = ? ORDER BY id DESC LIMIT ?`).all(device, limit);
  return db.prepare(`SELECT * FROM geofence_events ORDER BY id DESC LIMIT ?`).all(limit);
}

module.exports = { db, saveTelemetry, insertGpsPosition, getLatestPositions, getHistory, saveGeofenceEvent, getGeofenceEvents };