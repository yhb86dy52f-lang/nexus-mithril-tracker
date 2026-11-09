const fs = require('fs');
const path = require('path');
const geofencesPath = require('path').join(__dirname, '..', '..', 'data/geofences.json');

let _cache = null;
let _cacheMtime = 0;
function loadGeofences() {
  // CORREGIDO v2: antes leía el archivo en CADA punto GPS. Ahora cachea y solo relee si cambió el archivo.
  try {
    if (fs.existsSync(geofencesPath)) {
      const st = fs.statSync(geofencesPath);
      if (_cache && st.mtimeMs === _cacheMtime) return _cache;
      _cache = JSON.parse(fs.readFileSync(geofencesPath, 'utf8'));
      _cacheMtime = st.mtimeMs;
      return _cache;
    }
  } catch (e) { console.error('Error leyendo geocercas:', e.message); }
  return _cache || [];
}

function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const estado = new Map();

function checkDevice(deviceId, lat, lon) {
  const geofences = loadGeofences();
  const eventos = [];
  for (const g of geofences) {
    const ahoraAdentro = pointInPolygon(lat, lon, g.polygon);
    const clave = `${deviceId}:${g.id}`;
    const antesAdentro = estado.get(clave);
    
    if (antesAdentro !== undefined && antesAdentro !== ahoraAdentro) {
      eventos.push({
        device_id: deviceId,
        geofence_id: g.id,
        geofence_nombre: g.nombre || g.id,
        tipo: ahoraAdentro ? 'entrada' : 'salida',
        lat, lon,
        timestamp: new Date().toISOString()
      });
    }
    estado.set(clave, ahoraAdentro);
  }
  return eventos;
}

module.exports = { loadGeofences, pointInPolygon, checkDevice };