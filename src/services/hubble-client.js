const fs = require('fs');
const path = require('path');

const configPath = require('path').join(__dirname, '..', '..', 'data/config.json');

// CORREGIDO v2: antes leia config.json solo al arrancar. Si cambiabas credenciales en /api/config, seguia usando la vieja hasta reiniciar.
// Ahora lee en cada llamada, sin cambiar URLs ni valores. APIs intactas.
function loadCfg() {
  let cfg = {};
  try { if (fs.existsSync(configPath)) cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch(e){}
  return {
    apiKey: cfg.hubbleApiKey || process.env.HUBBLE_API_KEY || '',
    orgId: cfg.hubbleOrgId || process.env.HUBBLE_ORG_ID || ''
  };
}

const HUBBLE_API_URL = 'https://api.hubble.com';

async function fetchHubbleDevices() {
    const { apiKey: API_KEY, orgId: ORG_ID } = loadCfg();
    if (!API_KEY || !ORG_ID) return [];
    try {
        const url = `${HUBBLE_API_URL}/v2/org/${ORG_ID}/devices`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
        if (!response.ok) throw new Error(`Hubble API status ${response.status}`);
        const data = await response.json();
        return data.devices || [];
    } catch (error) {
        console.error("❌ Error Hubble:", error.message);
        return [];
    }
}
module.exports = { fetchHubbleDevices };
