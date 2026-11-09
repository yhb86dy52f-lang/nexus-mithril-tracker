require('dotenv').config();
const path = require('path');
const Fastify = require('fastify');
const db = require('./db');
const fs = require('fs');
const wsBroadcast = require('./ws-broadcast');
const geofenceMod = require('./geofence');
const gpsRouter = require('./gps_router');
const hubbleRoutes = require('./hubble-routes');
const configRoutes = require('./config-routes');
const diagnosticoRoutes = require('./diagnostico-routes');


const API_KEY = process.env.API_KEY || 'RF-NEXUS-SECURE-2026';
const PORT = Number(process.env.PORT || 3100);
const HOST = process.env.HOST || '0.0.0.0';

async function build() {
  const fastify = Fastify({ logger: true });
  const sseClients = new Set();

  // 1. Permisos de Seguridad (CSP)
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; img-src 'self' data: https://*.tile.openstreetmap.org; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://ntfy.sh;");
    return payload;
  });

  await fastify.register(require('@fastify/cors'), { origin: true });
  await fastify.register(require('@fastify/websocket'));
  await fastify.register(require('@fastify/static'), { root: path.join(__dirname, 'public'), prefix: '/' });

  // 2. ÚNICO Guardia de Seguridad
  fastify.addHook('onRequest', async (req, reply) => {
    if ((req.url || '').startsWith('/api/')) {
      if (req.headers['sec-fetch-site'] === 'same-origin') return;
      if (req.url === '/api/hubble/webhook') return; 
      const isReadOnly = req.method === 'GET' && (
        req.url.startsWith('/api/posiciones/') || 
        req.url.startsWith('/api/hubble/devices') ||
        req.url.startsWith('/api/device/')
      );
      if (isReadOnly) return;
      
      const key = req.headers['x-api-key'];
      if (API_KEY && key !== API_KEY) {
        reply.code(401).send({ ok: false, error: 'unauthorized' });
        return;
      }
    }
  });

  // 3. WebSockets
  fastify.get('/ws', { websocket: true }, (conn) => {
    const socket = conn.socket || conn;
    wsBroadcast.addSocket(socket);
    socket.send(JSON.stringify({ type: 'hello', msg: 'conectado a NEXUS-MITHRIL' }));
    socket.on('close', () => wsBroadcast.removeSocket(socket));
    socket.on('error', () => wsBroadcast.removeSocket(socket));
  });

  // 4. Rutas
  await fastify.register(gpsRouter);
  await fastify.register(hubbleRoutes);

  // 5. Telemetría IoT
  fastify.post('/api/telemetria', async (req, reply) => {
    const b = req.body || {};
    const lat = Number(b.lat), lon = Number(b.lon);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return reply.code(400).send({ ok: false, error: 'lat invalida' });
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return reply.code(400).send({ ok: false, error: 'lon invalida' });
    if (!b.device) return reply.code(400).send({ ok: false, error: 'falta device' });

    const data = { device: b.device, nombre: b.nombre || b.device, lat, lon, velocidad: Number(b.velocidad ?? 0), temperatura: b.temperatura ?? null, vibracion: b.vibracion ?? null, bateria_v: b.bateria_v ?? null, rpm: b.rpm ?? null, fuente: 'personal', timestamp: new Date().toISOString() };
    db.saveTelemetry(data);
    
    const events = geofenceMod.checkDevice(data.device, lat, lon);
    for (const ev of events) {
      db.saveGeofenceEvent(ev);
      wsBroadcast.broadcast({ type: 'geofence', ...ev });
    }
    
    wsBroadcast.broadcast({ type: 'telemetria', ...data });
    if(typeof global.emitSSE === 'function') global.emitSSE({ type: 'telemetria', ...data });
    return { ok: true };
  });

  fastify.get('/api/posiciones/latest', async () => {
    const rows = db.getLatestPositions();
    return rows.map(r => ({
      ...r, dispositivo_id: r.device, mid: r.device, fuente: r.fuente || 'sms'
    }));
  });
  
  fastify.get('/api/posiciones/history', async (req) => {
    const device = req.query.device || null;
    const limit = parseInt(req.query.limit || 100, 10) || 100;
    return db.getHistory(device, limit);
  });

  // RUTA DE LOGS CRUDOS (RAW SMS)
  fastify.get('/api/device/:device/raw-sms', async (req, reply) => {
    try {
      const rows = db.getRawSMS(req.params.device, 100);
      return rows;
    } catch (e) {
      req.log.error('RAW SMS ERROR:', e.message);
      return reply.status(500).send({ error: e.message });
    }
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
      
      await fetch(ntfyUrl, {
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
      return reply.send({ status: 'OK', deviceId, phoneNumber: phoneNumber || null, command: command || '!R5' });
    } catch (err) {
      return reply.status(500).send({ error: 'Error contactando ntfy' });
    }
  });

  fastify.get('/api/stream', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();
    const client = reply.raw;
    sseClients.add(client);
    client.write('data: {"type":"connected"}\n\n');
    request.raw.on('close', () => sseClients.delete(client));
  });

  global.emitSSE = function(data) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try { client.write(payload); } catch (e) {}
    }
  };

  await fastify.register(configRoutes);
  await fastify.register(diagnosticoRoutes);
  return fastify;
}

async function main() {
  const app = await build();
  await app.listen({ port: PORT, host: HOST });
}
if (require.main === module) main();
module.exports = { build };