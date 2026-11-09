let parseAnySMS;
try {
    const parserModule = require('../index.js');
    parseAnySMS = parserModule.parseAnySMS;
} catch (e) {
    console.warn('⚠️ Parser real no disponible, usando fallback.');
    parseAnySMS = (texto) => ({ family: 'UNKNOWN', error: 'Parser no cargado', original: texto });
}

module.exports = async function diagnosticoRoutes(fastify, opts) {
  fastify.post('/api/diagnostico/parse', async (req, reply) => {
    const { texto } = req.body || {};
    if (!texto || !String(texto).trim()) return reply.status(400).send({ error: 'Falta el campo texto' });

    try {
      const resultado = parseAnySMS(String(texto).trim());
      // CORREGIDO v2: si el parser devuelve null/undefined, no romper. Devolver estructura vacía.
      return reply.send({ status: 'OK', original: texto, parsed: resultado ?? { family: 'UNKNOWN', error: 'Parser devolvió vacío' } });
    } catch (err) {
      return reply.status(500).send({ error: 'Error del parser: ' + err.message });
    }
  });
};
