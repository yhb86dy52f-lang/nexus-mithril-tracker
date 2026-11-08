const fs = require('fs');
const path = require('path');
module.exports = async function pockethookRoutes(fastify, opts) {
  fastify.get('/api/pockethook-queue', async () => { return { ok: true, queue: [], status: 'online' }; });
  fastify.get('/api/pockethook/health', async () => { return { ok: true, status: 'online' }; });
  fastify.post('/api/pockethook/send-sms', async (request, reply) => {
    let { deviceId, phoneNumber, command } = request.body || {};
    if (!phoneNumber && deviceId) {
      try {
        const phonesPath = path.join(__dirname, 'data', 'device_phones.json');
        if (fs.existsSync(phonesPath)) {
          const phones = JSON.parse(fs.readFileSync(phonesPath, 'utf8'));
          const key = String(deviceId).toUpperCase().trim().replace(/\s+/g, ' ');
          phoneNumber = phones[key] || phones[String(deviceId).toUpperCase().trim()] || null;
        }
      } catch(e) {}
    }
    if (!phoneNumber) return reply.status(400).send({ error: 'Falta phoneNumber' });
    return reply.send({ msg: 'Comando para ' + deviceId + ': ' + (command || '!R5'), shortcut: 'Comando Anduril SMS', data: { deviceId: deviceId || 'unknown', phoneNumber, command: command || '!R5' } });
  });
};