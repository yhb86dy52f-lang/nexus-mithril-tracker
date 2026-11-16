const { insertGpsPosition, saveRawSMS } = require('../services/db');
const { checkDevice } = require('../services/geofence');
const { broadcast } = require('../services/ws-broadcast');
const { parseAnySMS } = require('../parsers/index.js');

function isValidLat(lat) { return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90; }
function isValidLon(lon) { return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180; }

module.exports = async function gpsRoutes(fastify, options) {
  fastify.post('/api/sms-gps', async (request, reply) => {
    const body = request.body || {};
    
    // Acepta 'sms_text' (como viene en tu atajo de iOS) o 'texto'
    let texto = '';
    if (typeof body === 'string') {
        texto = body;
    } else if (body.sms_text && typeof body.sms_text === 'string') {
        texto = body.sms_text.trim();
    } else if (body.texto && typeof body.texto === 'string') {
        texto = body.texto.trim();
    }

    if (!texto) {
        fastify.log.warn(`[SMS GPS] Petición sin texto. Body: ${JSON.stringify(body)}`);
        return reply.status(400).send({ error: 'Falta el campo sms_text o texto', body_recibido: body });
    }

    let device = 'sms-unknown';
    const midMatch = texto.match(/MID:\s*([a-zA-Z0-9-]+)/i) || texto.match(/ESN:\s*([a-zA-Z0-9-]+)/i) || texto.match(/(\d{10,15})/);
    if (midMatch) device = midMatch[1];
    if (body.device) device = body.device;

    try {
        saveRawSMS(device, texto);
        fastify.log.info(`[RAW SMS] Guardado para ${device}. Texto: ${texto.substring(0, 60)}...`);
    } catch (err) {
        fastify.log.error(`[RAW SMS ERROR] ${err.message}`);
    }

    let parsedData = {};
    try {
        parsedData = parseAnySMS(texto);
    } catch (err) {
        fastify.log.error(`[PARSER ERROR] ${err.message}`);
    }

    let lat = null, lon = null;
    if (body.lat && body.lon) {
        lat = Number(body.lat); lon = Number(body.lon);
    } else {
        const m = texto.match(/LAT:\s*([-]?\d+\.\d+)\s*LON:\s*([-]?\d+\.\d+)/i) || texto.match(/([-]?\d{2,3}\.\d+)\s*[,;\s]\s*([-]?\d{2,3}\.\d+)/);
        if (m) { lat = parseFloat(m[1]); lon = parseFloat(m[2]); }
    }

    if (lat !== null && lon !== null && isValidLat(lat) && isValidLon(lon)) {
        try {
            const eventos = checkDevice(device, lat, lon);
            for (const e of eventos) { broadcast({ type: 'geofence', ...e }); }
        } catch (e) {}

        try {
            const payloadToSave = {
                device: device,
                nombre: body.nombre || parsedData.nombre || device,
                lat: lat, lon: lon,
                velocidad: parsedData.velocidad || 0,
                temperatura: parsedData.tempC1 || parsedData.tempC2 || null,
                bateria_v: parsedData.voltU || null,
                rssi: parsedData.rssi || null,
                voltaje: parsedData.voltU || parsedData.voltG || null,
                estado_sensores: parsedData.estado || null,
                fuente: 'sms',
                timestamp: new Date().toISOString()
            };
            const row = insertGpsPosition(payloadToSave);
            broadcast({ type: 'telemetria', ...payloadToSave });
            return reply.send({ status: 'OK', message: 'SMS procesado y mapeado', device, lat, lon });
        } catch (err) {
            return reply.status(500).send({ error: 'Error BD', details: err.message });
        }
    }

    return reply.send({ status: 'OK', message: 'Texto guardado en raw_sms (sin coordenadas)', device });
  });
};