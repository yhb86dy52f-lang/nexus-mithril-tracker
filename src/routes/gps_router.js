const { insertGpsPosition, saveRawSMS } = require('../services/db');
const { checkDevice } = require('../services/geofence');
const { broadcast } = require('../services/ws-broadcast');
const { parseAnySMS } = require('../parsers/index.js');

function isValidLat(lat) { return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90; }
function isValidLon(lon) { return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180; }

module.exports = async function gpsRoutes(fastify, options) {
  fastify.post('/api/sms-gps', async (request, reply) => {
    const body = request.body || {};
    let texto = '';
    
    // MAGIA: Detecta si el texto viene como string, como objeto 'texto', 'sms', 'message', o si es todo el body
    if (typeof body === 'string') {
        texto = body;
    } else if (typeof body === 'object') {
        texto = body.texto || body.sms || body.message || body.body || JSON.stringify(body);
    }

    if (!texto || texto === '{}') {
        return reply.status(400).send({ error: 'No se recibió ningún texto en la petición' });
    }

    // 1. Extraer el ID del dispositivo (si existe en el texto)
    let device = 'sms-unknown';
    const midMatch = texto.match(/MID:\s*([a-zA-Z0-9-]+)/i) || texto.match(/ESN:\s*([a-zA-Z0-9-]+)/i);
    if (midMatch) device = midMatch[1];
    if (body.device) device = body.device;

    // 2. GUARDAR SIEMPRE EL TEXTO CRUDO (La tabla raw_sms nunca se salta nada)
    try {
        saveRawSMS(device, texto);
        fastify.log.info(`[RAW SMS] Guardado exitosamente para ${device}`);
    } catch (err) {
        fastify.log.error(`[RAW SMS ERROR] No se pudo guardar: ${err.message}`);
    }

    // 3. Parsear TODA la telemetría
    let parsedData = {};
    try {
      parsedData = parseAnySMS(texto);
      fastify.log.info(`[PARSER] Familia detectada: ${parsedData.family} para equipo ${device}`);
    } catch (err) {
      fastify.log.error(`[PARSER ERROR] No se pudo parsear: ${err.message}`);
    }

    // 4. Extraer latitud y longitud
    let lat = null, lon = null;
    if (body.lat && body.lon) {
        lat = Number(body.lat);
        lon = Number(body.lon);
    } else {
        const latLonMatch = texto.match(/LAT:\s*([-]?\d+\.\d+)\s*LON:\s*([-]?\d+\.\d+)/i) || texto.match(/([-]?\d{2,3}\.\d+)\s*[,;\s]\s*([-]?\d{2,3}\.\d+)/);
        if (latLonMatch) {
          lat = parseFloat(latLonMatch[1]);
          lon = parseFloat(latLonMatch[2]);
        }
    }

    // 5. Si tiene coordenadas, guardar en la tabla de posiciones (mapa)
    if (lat !== null && lon !== null && isValidLat(lat) && isValidLon(lon)) {
      try {
        const eventos = checkDevice(device, lat, lon);
        for (const e of eventos) { 
          fastify.log.info(`[GEOCERCAS] ${e.device_id} ${e.tipo} ${e.geofence_nombre}`); 
          broadcast({ type: 'geofence', ...e });
        }
      } catch (e) {}

      try {
        const payloadToSave = {
          device: device,
          nombre: body.nombre || parsedData.nombre || device,
          lat: lat,
          lon: lon,
          velocidad: parsedData.velocidad || 0,
          temperatura: parsedData.tempC1 || parsedData.tempC2 || null,
          vibracion: null,
          bateria_v: parsedData.voltU || null,
          rpm: null,
          rssi: parsedData.rssi || null,
          voltaje: parsedData.voltU || parsedData.voltG || null,
          estado_sensores: parsedData.estado || null,
          fuente: 'sms',
          timestamp: new Date().toISOString()
        };

        const row = insertGpsPosition(payloadToSave);
        
        if (typeof global.emitSSE === 'function') global.emitSSE({ type: 'telemetria', ...payloadToSave });
        broadcast({ type: 'telemetria', ...payloadToSave });
        
        return reply.send({ status: 'OK', message: 'SMS procesado y mapeado', id: row.lastInsertRowid, device, lat, lon, telemetria: payloadToSave });
      } catch (err) {
        return reply.status(500).send({ error: 'Error en BD', details: err.message });
      }
    } 
    
    // 6. Si NO tiene coordenadas (es solo texto, estatus o falla), igual devolvemos OK
    return reply.send({ status: 'OK', message: 'Texto recibido y guardado en raw_sms (sin coordenadas)', device, parsed: parsedData });
  });
};