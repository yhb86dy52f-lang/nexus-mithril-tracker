const path = require('path');
const hubbleRoutes = require('./hubble-routes');
const pockethookRoutes = require('./pockethook_routes');
const fs = require('fs');
const Fastify = require('fastify');

function safeRequire(p) { const m = require(p); return m.default || m; }
const cors = safeRequire('@fastify/cors');
const websocket = safeRequire('@fastify/websocket');
const statik = safeRequire('@fastify/static');
const gpsModule = safeRequire('./gps_router');
const gpsRoutes = gpsModule.gpsRoutes || gpsModule.default || gpsModule;
const wsBroadcast = safeRequire('./ws-broadcast');
const dbMod = safeRequire('./db');
const geofenceMod = safeRequire('./geofence');

const API_KEY = process.env.API_KEY || '';
const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || '0.0.0.0';

async function build() {
  const fastify = Fastify({ logger: true });
  await fastify.register(cors, { origin: true });
  await fastify.register(websocket);

  fastify.addHook('onRequest', async (req, reply) => {
    const url = req.url || '';
    if (url.startsWith('/api/')) {
      const key = req.headers['x-api-key'];
      if (API_KEY && key !== API_KEY) { reply.code(401).send({ ok: false, error: 'unauthorized' }); return; }
    }
  });

  fastify.get('/', async (request, reply) => { return reply.redirect('/fleet.html'); });

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const socket = connection.socket || connection;
    try { wsBroadcast.addSocket(socket); } catch (e) {}
    try { socket.send(JSON.stringify({ type: 'hello', msg: 'conectado a NEXUS-MITHRIL' })); } catch (e) {}
    socket.on('close', () => { try { wsBroadcast.removeSocket(socket); } catch (e) {} });
    socket.on('error', () => { try { wsBroadcast.removeSocket(socket); } catch (e) {} });
  });

  fastify.get('/api/ble/status', async () => { return { ok: true, status: 'no-ble', msg: 'stub' }; });
  fastify.get('/health', async () => { return { ok: true, service: 'NEXUS-MITHRIL' }; });

  fastify.post('/api/telemetria', async (req, reply) => {
    const b = req.body || {};
    const lat = Number(b.lat);
    const lon = Number(b.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return reply.code(400).send({ ok: false, error: 'lat invalida' });
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return reply.code(400).send({ ok: false, error: 'lon invalida' });
    if (!b.device && !b.device_id && !b.dispositivo_id) return reply.code(400).send({ ok: false, error: 'falta device' });

    const data = {
      device: b.device || b.device_id || b.dispositivo_id,
      nombre: b.nombre || b.device,
      lat, lon,
      velocidad: Number(b.velocidad ?? b.speed_kmh ?? 0),
      temperatura: b.temperatura ?? b.temp_c ?? null,
      vibracion: b.vibracion ?? b.vibration_g ?? null,
      bateria_v: b.bateria_v ?? b.battery_v ?? null,
      rpm: b.rpm ?? null,
      voltaje: b.voltaje ?? b.bateria_v ?? null,
      rssi: b.rssi ?? null,
      fuente: b.fuente || 'hubble',
      estado_sensores: b.estado_sensores || 'ok',
      timestamp: b.timestamp || new Date().toISOString()
    };

    try {
      dbMod.saveTelemetry(data);
      const events = geofenceMod.checkDevice(data.device, lat, lon);
      for (const ev of events) {
        dbMod.saveGeofenceEvent(ev);
        try { wsBroadcast.broadcast(JSON.stringify({ type: 'geofence', ...ev })); } catch (e) {}
      }
      try { wsBroadcast.broadcast(JSON.stringify({ type: 'telemetria', ...data })); } catch (e) {}
      return { ok: true, device: data.device, geofence_events: events };
    } catch (e) {
      fastify.log.error(e);
      return reply.code(500).send({ ok: false, error: 'db error' });
    }
  });

  fastify.get('/api/geofences', async () => { return geofenceMod.loadGeofences(); });
  fastify.get('/api/geofence-events', async (req) => {
    const device = req.query.device || null;
    const limit = parseInt(req.query.limit || 100, 10) || 100;
    return dbMod.getGeofenceEvents(device, limit);
  });

  fastify.get('/api/posiciones/latest', async () => {
    try {
      if (typeof dbMod.getLatestPositions === 'function') {
        const rows = dbMod.getLatestPositions();
        return rows.map((r) => ({
          dispositivo_id: r.device || r.dispositivo_id,
          nombre: r.nombre || r.device,
          lat: r.lat, lon: r.lon,
          velocidad: r.velocidad || 0,
          temperatura: r.temperatura ?? null,
          vibracion: r.vibracion ?? null,
          bateria_v: r.bateria_v ?? null,
          rpm: r.rpm ?? null,
          fuente: r.fuente || 'hubble',
          timestamp: r.timestamp,
          rssi: r.rssi, voltaje: r.voltaje, estado_sensores: r.estado_sensores
        }));
      }
    } catch (e) { fastify.log.error(e); }
    return [];
  });

  fastify.get('/api/posiciones/history', async (req) => {
    try {
      const device = req.query.device || req.query.deviceId || req.query.mac || null;
      const limit = parseInt(req.query.limit || 100, 10) || 100;
      const rows = device ? dbMod.getHistory(device, limit) : dbMod.getHistory(null, limit);
      return Array.isArray(rows) ? rows : [];
    } catch (e) { fastify.log.error(e); return []; }
  });

  fastify.post('/api/ntfy/send-sms', async (request, reply) => {
    try {
      let { deviceId, phoneNumber, command } = request.body || {};
      if (!deviceId) return reply.status(400).send({ error: 'Falta deviceId' });
      let key = String(deviceId).toUpperCase().trim().replace(/\s+/g, ' ');
      key = key.replace(/^(CT|KW)\s*(\d+)/, '$1 $2');
      if (!phoneNumber) {
        const phonesPath = path.join(__dirname, 'data', 'device_phones.json');
        if (fs.existsSync(phonesPath)) {
          const phones = JSON.parse(fs.readFileSync(phonesPath, 'utf8'));
          phoneNumber = phones[key] || phones[String(deviceId).toUpperCase().trim()] || null;
        }
      }
      const NTFY_TOPIC = process.env.NTFY_TOPIC || 'runeforge-comando-mithril';
      const ntfyUrl = 'https://ntfy.sh/' + NTFY_TOPIC;
      const payload = { deviceId, phoneNumber: phoneNumber || null, command: command || '!R5' };
      const shortcutUrl = 'shortcuts://run-shortcut?name=Comando%20Mithril&input=text&text=' + encodeURIComponent(JSON.stringify(payload));
      const response = await fetch(ntfyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: NTFY_TOPIC,
          message: 'Comando para ' + deviceId + ': ' + (command || '!R5'),
          title: 'Comando Mithril',
          priority: 5,
          tags: ['robot'],
          actions: [{ action: 'view', label: 'Ejecutar Atajo', url: shortcutUrl }]
        })
      });
      if (!response.ok) return reply.status(502).send({ error: 'ntfy rechazó' });
      return reply.send({ status: 'OK', deviceId, phoneNumber: phoneNumber || null, command: command || '!R5' });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Error contactando ntfy' });
    }
  });

  if (typeof gpsRoutes === 'function') { await fastify.register(gpsRoutes); }
  await fastify.register(statik, { root: path.join(__dirname, 'public'), prefix: '/' });
  await fastify.register(hubbleRoutes);
  await fastify.register(pockethookRoutes);
  return fastify;
}

async function main() {
  const fastify = await build();
  try { await fastify.listen({ port: PORT, host: HOST }); } catch (err) { fastify.log.error(err); process.exit(1); }
}
if (require.main === module) { main(); }
module.exports = { build };