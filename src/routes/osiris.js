async function osirisRoutes(fastify) {
  fastify.get('/api/osiris/cctv', async (req, reply) => {
    // Forzamos las cámaras Mock para evitar bloqueos de red
    const mockCameras = [
      { id: "cam-1", name: "El Paso - Puente Internacional", lat: 31.758, lon: -106.486 },
      { id: "cam-2", name: "Ciudad Juárez - Centro", lat: 31.690, lon: -106.424 },
      { id: "cam-3", name: "Laredo - Puente de las Américas", lat: 27.506, lon: -99.507 },
      { id: "cam-4", name: "McAllen - Anzaldúas", lat: 26.204, lon: -98.236 },
      { id: "cam-5", name: "Brownsville - Puente de los Héroes", lat: 25.901, lon: -97.497 },
      { id: "cam-6", name: "Eagle Pass - Puente 2", lat: 28.709, lon: -100.499 },
      { id: "cam-7", name: "Del Rio - Puente", lat: 29.362, lon: -100.896 },
      { id: "cam-8", name: "Presidio", lat: 29.560, lon: -104.372 },
      { id: "cam-9", name: "San Diego", lat: 32.715, lon: -117.161 },
      { id: "cam-10", name: "Nogales", lat: 31.340, lon: -110.934 }
    ];
    
    return reply.code(200).send({ ok: true, region: 'texas', cameras: mockCameras, mock: true });
  });

  fastify.get('/api/osiris/context', async (req, reply) => {
    return reply.code(200).send({ ok: true, fires: [], weather: [], quakes: [], mock: true });
  });
}
module.exports = osirisRoutes;
