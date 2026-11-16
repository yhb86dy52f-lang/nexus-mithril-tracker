const { fetchHubbleDevices } = require('../services/hubble-client');
const db = require('../services/db');
const { broadcast } = require('../services/ws-broadcast');
const { checkDevice } = require('../services/geofence');




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
    if (global.isSystemPaused) return reply.send([]);
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
      // 1. Validar token
      const secret = process.env.HUBBLE_WEBHOOK_SECRET;
      const token = req.headers['x-hubble-token'];
      if (secret && token !== secret) {
        req.log.warn('Intento de webhook no autorizado bloqueado.');
        return reply.status(401).send({ error: 'Unauthorized: Token invalido' });
      }

      // 2. Normalizar a array de paquetes
      let packets = [];
      const body = req.body;
      if (Array.isArray(body)) {
        packets = body;
      } else if (body && Array.isArray(body.packets)) {
        packets = body.packets;
      } else if (body && Array.isArray(body.data)) {
        packets = body.data;
      } else if (body && typeof body === 'object') {
        // Un solo paquete (acepta cualquier estructura)
        packets = [body];
      }

      if (packets.length === 0) {
        req.log.warn(`[WEBHOOK] Payload vacio. Body: ${JSON.stringify(body).substring(0, 200)}`);
        return reply.send({ status: 'OK', message: 'Payload vacio' });
      }

      // 3. Procesar cada paquete (acepta formato Hubble Y formato simple)
      let savedCount = 0;
      for (const p of packets) {
        let lat = null, lon = null, deviceId = null, name = null, rssi = null, ts = null;

        // Formato A: Hubble real { location: {latitude, longitude}, device: {id, name} }
        if (p.location && p.location.latitude && p.location.longitude) {
          lat = p.location.latitude;
          lon = p.location.longitude;
          deviceId = (p.device && p.device.id) || 'hubble-unknown';
          name = (p.device && p.device.name) || deviceId;
          rssi = (p.device && p.device.rssi) || null;
          ts = (p.device && p.device.timestamp) ? p.device.timestamp * 1000
             : (p.location.timestamp ? p.location.timestamp * 1000 : Date.now());
        }
        // Formato B: simple { device: "ID", lat, lon } o { device_id, latitude, longitude }
        else if (
          (typeof p.lat === 'number' || typeof p.latitude === 'number') &&
          (typeof p.lon === 'number' || typeof p.longitude === 'number')
        ) {
          lat = p.lat ?? p.latitude;
          lon = p.lon ?? p.longitude;
          deviceId = p.device || p.device_id || p.deviceId || 'test-device';
          name = p.name || deviceId;
          rssi = p.rssi || null;
          ts = p.timestamp ? (p.timestamp * 1000) : Date.now();
        }

        if (lat === null || lon === null) {
          req.log.warn(`[WEBHOOK] Paquete sin coordenadas. Keys: ${Object.keys(p).join(', ')}`);
          continue;
        }

        // 4. Guardar en DB
        db.saveTelemetry({
          device: deviceId,
          nombre: name,
          lat: lat,
          lon: lon,
          rssi: rssi,
          fuente: 'hubble',
          timestamp: new Date(ts).toISOString()
        });

        // 5. Emitir por WebSocket
        try { broadcast({ type: 'telemetria', device: deviceId, lat, lon, fuente: 'hubble' }); } catch(e) {}

        savedCount++;
      }

      req.log.info(`[HUBBLE WEBHOOK] Recibidos ${savedCount}/${packets.length} paquetes en tiempo real.`);
      return reply.code(200).send({ status: 'OK', message: `Recibidos ${savedCount} paquetes`, total: packets.length });
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({ error: 'Error interno procesando webhook', details: err.message });
    }
  });
};

