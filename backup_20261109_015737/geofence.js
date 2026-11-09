const fs = require('fs');
const path = require('path');
const geofencesPath = path.join(__dirname, 'geofences.json');

function loadGeofences() {
  try {
    if (fs.existsSync(geofencesPath)) return JSON.parse(fs.readFileSync(geofencesPath, 'utf8'));
  } catch (e) { console.error('Error leyendo geocercas:', e.message); }
  return [];
}

function pointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0]; // Ajustado a [lat, lon] o [lon, lat] según config
    const xj = polygon[j][1], yj = polygon[j][0];
    // Nota: dependiendo de cómo se guardó en geofences.json, esto puede necesitar ajuste
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