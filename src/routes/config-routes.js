const fs = require('fs');
const path = require('path');

const configPath = require('path').join(__dirname, '..', '..', 'data/config.json');
let currentConfig = {};

if (fs.existsSync(configPath)) {
    try { currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch(e){}
}

if (!currentConfig.hubbleApiKey && process.env.HUBBLE_API_KEY) currentConfig.hubbleApiKey = process.env.HUBBLE_API_KEY;
if (!currentConfig.hubbleOrgId && process.env.HUBBLE_ORG_ID) currentConfig.hubbleOrgId = process.env.HUBBLE_ORG_ID;
if (!currentConfig.hubbleWebhookSecret && process.env.HUBBLE_WEBHOOK_SECRET) currentConfig.hubbleWebhookSecret = process.env.HUBBLE_WEBHOOK_SECRET;

function saveConfig(cfg) {
    currentConfig = { ...currentConfig, ...cfg };
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
}

function reloadConfig() { try { if (fs.existsSync(configPath)) currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch(e){} }

module.exports = async function configRoutes(fastify, opts) {
  fastify.get('/api/config', async () => { reloadConfig(); return ({
    hasApiKey: !!currentConfig.hubbleApiKey,
    orgId: currentConfig.hubbleOrgId || '',
    hasWebhook: !!currentConfig.hubbleWebhookSecret
  }); });

  fastify.post('/api/config', async (req, reply) => {
    const { apiKey, orgId } = req.body || {};
    if (apiKey && apiKey !== '******** (Guardado)') saveConfig({ hubbleApiKey: apiKey });
    if (orgId) saveConfig({ hubbleOrgId: orgId });
    return reply.send({ ok: true, message: 'Credenciales guardadas.' });
  });

  fastify.post('/api/config/webhook', async (req, reply) => {
    const { targetUrl } = req.body || {};
    
    if (!currentConfig.hubbleApiKey || !currentConfig.hubbleOrgId) {
        return reply.status(400).send({ error: 'Faltan credenciales de Hubble.' });
    }
    
    try {
        const url = `https://api.hubble.com/api/org/${currentConfig.hubbleOrgId}/webhooks`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentConfig.hubbleApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: 'TGL-SP-RECOVERY-HUB',
                url: targetUrl,
                max_batch_size: 100
            })
        });
        
        const data = await res.json();
        
        if (!res.ok) {
            return reply.status(res.status).send({ error: data.message || 'Error de Hubble', details: data });
        }
        
        if (data.secret) {
            saveConfig({ hubbleWebhookSecret: data.secret });
            process.env.HUBBLE_WEBHOOK_SECRET = data.secret; // Actualizar memoria dinámicamente
            try {
                const envPath = path.join(__dirname, '.env');
                let envContent = '';
                if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, 'utf8');
                if (/HUBBLE_WEBHOOK_SECRET=/.test(envContent)) {
                  envContent = envContent.replace(/HUBBLE_WEBHOOK_SECRET=.*/g, `HUBBLE_WEBHOOK_SECRET=${data.secret}`);
                } else {
                  if (envContent && !envContent.endsWith('\n')) envContent += '\n';
                  envContent += `HUBBLE_WEBHOOK_SECRET=${data.secret}\n`;
                }
                fs.writeFileSync(envPath, envContent);
            } catch(e) {}
            
            return reply.send({ ok: true, message: 'Webhook registrado.', secretSaved: true });
        } else {
            return reply.status(500).send({ error: 'Hubble no devolvió el secreto.' });
        }
    } catch (e) {
        return reply.status(500).send({ error: 'Error de red contactando a Hubble.' });
    }
  });
};
