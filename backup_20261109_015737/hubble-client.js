const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'data', 'config.json');
let cfg = {};
try { if (fs.existsSync(configPath)) cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch(e){}

const HUBBLE_API_URL = 'https://api.hubble.com';
const API_KEY = cfg.hubbleApiKey || process.env.HUBBLE_API_KEY || '';
const ORG_ID = cfg.hubbleOrgId || process.env.HUBBLE_ORG_ID || '';

async function fetchHubbleDevices() {
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