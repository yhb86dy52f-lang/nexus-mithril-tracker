const { fetchHubbleDevices } = require('../services/hubble-client');
const db = require('../services/db');
const { broadcast } = require('../services/ws-broadcast');
const { checkDevice } = require('../services/geofence');
const fs = require('fs');
const path = require('path');

function getWebhookSecret() {
  // CORREGIDO v2: antes solo leia process.env, pero config-routes guarda el secret en data/config.json.
  // Ahora lee env primero, luego config.json, sin cambiar valores ni APIs.
  if (process.env.HUBBLE_WEBHOOK_SECRET) return process.env.HUBBLE_WEBHOOK_SECRET;
  try {
    const p = path.join(__dirname, 'data', 'config.json');
    if (fs.existsSync(p)) {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (cfg.hubbleWebhookSecret) return cfg.hubbleWebhookSecret;
    }
  } catch (e) {}
  return '';
}

module.exports = async function hubbleRoutes(fastify, opts) {
  // 1. Ruta manual de sincronización (Pull) - API y URLs intactas
  fastify.post('/api/hubble/sync', async (req, reply) => {
    try {
      const devices = await fetchHubbleDevices();
      let savedCount = 0;
      
      for (const d of devices) {
        if (d.most_recent_packet && d.most_recent_packet.terrestrial && d.most_recent_packet.terrestrial.location) {
          const loc = d.most_recent_packet.terrestrial.location;
          const ts = d.most_recent_packet.terrestrial.timestamp * 1000;
          
          db.saveTelemetry({
            device: d.id,
            nombre: d.name || d.id,
            lat: loc.latitude,
            lon: loc.longitude,
            fuente: 'hubble',
            timestamp: new Date(ts).toISOString()
          });
          savedCount++;
        }
      }
      return reply.send({ status: 'OK', message: `Se sincronizaron ${savedCount} dispositivos con ubicación`, count: savedCount });
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({ error: 'Error sincronizando con Hubble' });
    }
  });

  // 2. Ruta de Webhook para tiempo real (Push) - API y URLs intactas
  // Ruta de respaldo
  fastify.get('/api/hubble/devices', async (req, reply) => {
    try {
      const rows = db.getLatestPositions().filter(r => r.fuente === 'hubble');
      return reply.send(rows.map(r => ({
        device_id: r.device, name: r.nombre || r.device, lat: r.lat, lon: r.lon,
        last_packet_ts: new Date(r.timestamp).getTime() / 1000, is_online: false
      })));
    } catch (e) { return reply.status(500).send({ error: 'Error' }); }
  });

  fastify.post('/api/hubble/webhook', async (req, reply) => {
    try {
      // Validar seguridad - secret desde env o config.json, sin cambiar API
      const secret = getWebhookSecret();
      const token = req.headers['x-hubble-token'];
      
      if (secret && token !== secret) {
        req.log.warn('⚠️ Intento de webhook no autorizado bloqueado.');
        return reply.status(401).send({ error: 'Unauthorized: Token inválido' });
      }

      const packets = Array.isArray(req.body) ? req.body : (req.body.packets || req.body.data || []);
      let savedCount = 0;

      for (const p of packets) {
        // CORREGIDO v2: guards contra p.device undefined (antes crasheaba si venia paquete sin device)
        const dev = p.device || {};
        const loc = p.location || p.terrestrial?.location || null;
        if (loc && loc.latitude && loc.longitude) {
          const deviceId = dev.id || p.deviceId || p.id || 'hubble-unknown';
          const lat = loc.latitude;
          const lon = loc.longitude;
          const rssi = dev.rssi ?? null;
          const ts = dev.timestamp ? dev.timestamp * 1000 : Date.now();

          db.saveTelemetry({
            device: deviceId,
            nombre: dev.name || deviceId,
            lat, lon, rssi,
            fuente: 'hubble',
            timestamp: new Date(ts).toISOString()
          });

          // CORREGIDO v2: geofence + SSE igual que en /api/telemetria y /api/sms-gps, para cohesión
          try {
            const eventos = checkDevice(deviceId, lat, lon);
            for (const e of eventos) {
              try { db.saveGeofenceEvent(e); } catch (err) {}
              broadcast({ type: 'geofence', ...e });
            }
          } catch (err) {}
          
          try { broadcast({ type: 'telemetria', device: deviceId, lat, lon, fuente: 'hubble' }); } catch(e) {}
          if (typeof global.emitSSE === 'function') { try { global.emitSSE({ type: 'telemetria', device: deviceId, lat, lon, fuente: 'hubble' }); } catch (e) {} }
          
          savedCount++;
        }
      }
      
      req.log.info(`[HUBBLE WEBHOOK] Recibidos ${savedCount} paquetes en tiempo real.`);
      return reply.code(200).send({ status: 'OK', message: `Recibidos ${savedCount} paquetes` });
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({ error: 'Error interno procesando webhook' });
    }
  });
};
