const Database = require('better-sqlite3');
const fs = require('fs');

const db = new Database('data/nexus.db');
let aliases = {};
try { aliases = JSON.parse(fs.readFileSync('device_aliases.json', 'utf8')); } catch(e) {}

const NTFY_TOPIC = "mi-topic-runeforge-12345"; // <--- CAMBIA ESTO POR TU TOPIC REAL
const MINUTOS_ALERTA = 60;

const query = `
    SELECT device, nombre, timestamp, fuente 
    FROM (
        SELECT device, nombre, timestamp, fuente, ROW_NUMBER() OVER(PARTITION BY device ORDER BY timestamp DESC) as rn 
        FROM posiciones
    ) WHERE rn = 1 ORDER BY timestamp DESC
`;
const rows = db.prepare(query).all();
const ahora = new Date();
const smsCaidos = [];

for (const r of rows) {
    if (r.fuente !== 'sms' && r.fuente !== 'SMS') continue;
    
    const diffMins = Math.floor((ahora - new Date(r.timestamp)) / 60000);
    if (diffMins >= MINUTOS_ALERTA) {
        const nombreFinal = aliases[r.device] || aliases[r.nombre] || r.nombre || r.device;
        smsCaidos.push({ device: r.device, nombre: nombreFinal, diffMins });
    }
}

if (smsCaidos.length > 0) {
    console.log(`⚠️ Encontrados ${smsCaidos.length} equipos SMS caídos. Enviando NTFY...`);
    let msg = "🚨 ALERTA DE FLOTA SMS:\n";
    for (const d of smsCaidos) {
        const horas = Math.floor(d.diffMins / 60);
        const tiempo = horas >= 24 ? `${Math.floor(horas/24)} días` : (horas >= 1 ? `${horas} hrs` : `${d.diffMins} min`);
        msg += `- ${d.nombre} (Hace ${tiempo})\n`;
    }
    msg += "\nRevisar Panel NEXUS-MITHRIL.";

    fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
            'Title': 'Alerta NEXUS: Equipos SMS Caídos',
            'Priority': 'high',
            'Tags': 'warning,tractor'
        },
        body: msg
    }).then(res => {
        if (res.ok) console.log("✅ Notificación NTFY enviada.");
        else console.error("🔴 Error en NTFY HTTP:", res.status);
    }).catch(err => console.error("🔴 Error enviando NTFY:", err.message));
} else {
    console.log("✅ Todos los equipos SMS reportaron en los últimos", MINUTOS_ALERTA, "minutos.");
}