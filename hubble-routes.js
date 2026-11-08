const { fetchHubbleDevices } = require('./hubble-client');
const db = require('./db');
const { broadcast } = require('./ws-broadcast');

module.exports = async function hubbleRoutes(fastify, opts) {
  // 1. Ruta manual de sincronización (Pull)
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

  // 2. Ruta de Webhook para tiempo real (Push)
  
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
      // Validar seguridad
      const secret = process.env.HUBBLE_WEBHOOK_SECRET;
      const token = req.headers['x-hubble-token'];
      
      // Si hay un secreto configurado y el token no coincide, se rechaza
      if (secret && token !== secret) {
        req.log.warn('⚠️ Intento de webhook no autorizado bloqueado.');
        return reply.status(401).send({ error: 'Unauthorized: Token inválido' });
      }

      // Parsear payload (Array directo o dentro de un objeto)
      const packets = Array.isArray(req.body) ? req.body : (req.body.packets || req.body.data || []);
      let savedCount = 0;

      for (const p of packets) {
        // Adaptado a la estructura del webhook de Hubble
        if (p.location && p.location.latitude && p.location.longitude) {
          const deviceId = p.device.id;
          const lat = p.location.latitude;
          const lon = p.location.longitude;
          const rssi = p.device.rssi || null;
          const ts = p.device.timestamp ? p.device.timestamp * 1000 : Date.now();

          db.saveTelemetry({
            device: deviceId,
            nombre: p.device.name || deviceId,
            lat, lon, rssi,
            fuente: 'hubble',
            timestamp: new Date(ts).toISOString()
          });
          
          // Emitir por WebSocket para que el mapa se actualice al instante
          try { broadcast({ type: 'telemetria', device: deviceId, lat, lon, fuente: 'hubble' }); } catch(e) {}
          
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