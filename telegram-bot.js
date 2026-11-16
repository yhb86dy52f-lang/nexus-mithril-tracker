const fs = require('fs');
const path = require('path');

// Leer .env manualmente para evitar dependencia de dotenv
const envPath = path.join(__dirname, '.env');
let env = {};
try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k && v.length) env[k.trim()] = v.join('=').trim();
    });
} catch(e) {}

const TOKEN = env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
    console.error('[TELEGRAM] Faltan credenciales en .env');
    process.exit(1);
}

let lastUpdateId = 0;

async function poll() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
        const data = await res.json();
        
        if (data.ok && data.result.length > 0) {
            for (const update of data.result) {
                lastUpdateId = update.update_id;
                if (update.message) {
                    const chatId = update.message.chat.id;
                    const text = update.message.text || '';
                    
                    if (chatId.toString() !== CHAT_ID.toString()) {
                        await sendMessage(chatId, '⛔ Acceso denegado.');
                        continue;
                    }
                    
                    if (text.startsWith('/start')) {
                        await sendMessage(chatId, '🛰️ *NEXUS-MITHRIL CENTRO DE MANDO*\n\nComandos:\n/status - Resumen\n/list - Unidades activas', 'Markdown');
                    } else if (text.startsWith('/status')) {
                        await sendStatus(chatId);
                    } else if (text.startsWith('/list')) {
                        await sendList(chatId);
                    }
                }
            }
        }
    } catch (e) {
        console.error('[TELEGRAM] Error en polling:', e.message);
    }
    setTimeout(poll, 1000);
}

async function sendMessage(chatId, text, parseMode) {
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: parseMode })
    });
}

async function sendStatus(chatId) {
    try {
        const res = await fetch('http://localhost:3100/api/posiciones/latest');
        const data = await res.json();
        const total = data.length;
        const online = data.filter(u => (new Date() - new Date(u.timestamp)) / 60000 < 15).length;
        const text = `📊 *ESTADO DE LA FLOTA*\n\n🟢 En línea: ${online}\n🔴 Fuera: ${total - online}\n📦 Total: ${total}`;
        await sendMessage(chatId, text, 'Markdown');
    } catch (e) {
        await sendMessage(chatId, '❌ Error obteniendo datos del servidor local.');
    }
}

async function sendList(chatId) {
    try {
        const res = await fetch('http://localhost:3100/api/posiciones/latest');
        const data = await res.json();
        const active = data.filter(u => (new Date() - new Date(u.timestamp)) / 60000 < 15);
        
        if (active.length === 0) {
            await sendMessage(chatId, 'No hay unidades en línea en este momento.');
            return;
        }
        
        let text = '📡 *UNIDADES EN LÍNEA*\n\n';
        active.forEach(u => {
            text += `🚙 *${u.nombre || u.device}*\n📍 Lat: ${Number(u.lat).toFixed(4)} | Lon: ${Number(u.lon).toFixed(4)}\n⚡ Vel: ${u.velocidad || 0} km/h\n\n`;
        });
        await sendMessage(chatId, text, 'Markdown');
    } catch (e) {
        await sendMessage(chatId, '❌ Error obteniendo datos del servidor local.');
    }
}

console.log('[TELEGRAM] Bot nativo iniciado (modo Long Polling).');
poll();