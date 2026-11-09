const { insertGpsPosition } = require('./db');
const { checkDevice } = require('./geofence');
const { broadcast } = require('./ws-broadcast');

function isValidLat(lat) { return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90; }
function isValidLon(lon) { return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180; }

module.exports = async function gpsRoutes(fastify, options) {
  fastify.post('/api/sms-gps', async (request, reply) => {
    const body = request.body || {};
    const texto = typeof body.texto === 'string' ? body.texto : '';
    let device = body.device || body.deviceId || 'sms-unknown';
    let lat = null, lon = null, rssi = null;
    let voltaje = null;
    let estado_sensores = null;

    if (texto) {
      const midMatch = texto.match(/MID:\s*(\d+)/i) || texto.match(/ESN:\s*(\d+)/i);
      if (midMatch) device = midMatch[1];

      const latLonMatch = texto.match(/LAT:\s*([-]?\d+\.\d+)\s*LON:\s*([-]?\d+\.\d+)/i) || texto.match(/([-]?\d{2,3}\.\d+)\s*[,;\s]\s*([-]?\d{2,3}\.\d+)/);
      if (latLonMatch) { lat = parseFloat(latLonMatch[1]); lon = parseFloat(latLonMatch[2]); }
      
      const comMatch = texto.match(/COM:\s*(-?\d+)/i);
      if (comMatch) rssi = parseInt(comMatch[1], 10);
      
      const voltMatch = texto.match(/([\d\.]+)V/i);
      if (voltMatch) voltaje = parseFloat(voltMatch[1]);

      if (texto.includes('3E70')) estado_sensores = 'FALLA TERMO';
    }

    if (body.lat !== undefined && body.lon !== undefined) { lat = Number(body.lat); lon = Number(body.lon); }

    if (lat !== null && lon !== null) {
      if (!isValidLat(lat) || !isValidLon(lon)) return reply.status(400).send({ error: 'Coordenadas invalidas' });
      
      try {
        // CORRECCIÓN AQUÍ: checkDevice en lugar de checkGeofences
        const eventos = checkDevice(device, lat, lon);
        for (const e of eventos) { 
          fastify.log.info(`[GEOCERCAS] ${e.device_id} ${e.tipo} ${e.geofence_nombre}`); 
          broadcast({ type: 'geofence', ...e });
        }
      } catch (e) {
        fastify.log.error('Error en geocercas:', e.message);
      }

      try {
        const row = insertGpsPosition({ device, lat, lon, rssi, voltaje, estado_sensores, fuente: 'sms' });
        if(typeof global.emitSSE === 'function') global.emitSSE({ type: 'telemetria', device, lat, lon, fuente: 'sms' });
        fastify.log.info(`[SMS GPS] Ubicación guardada para ${device} (Lat: ${lat}, Lon: ${lon})`);
        broadcast({ type: 'telemetria', device, lat, lon, fuente: 'sms' });
        return reply.send({ status: 'OK', message: 'SMS procesado', id: row.lastInsertRowid, device, lat, lon });
      } catch (err) {
        fastify.log.error(err);
        return reply.status(500).send({ error: 'Error en BD', details: err.message });
      }
    } 
    
    fastify.log.info(`[SMS GPS] Estatus recibido de ${device} (sin coordenadas)`);
    return reply.send({ status: 'OK', message: 'SMS de estatus recibido' });
  });
};
