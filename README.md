# NEXUS-MITHRIL Tracker

Sistema de rastreo y telemetria de flotas basado en ingesta de tramas SMS (formato CalAmp) con soporte multi-protocolo, geocercas y visualizacion en tiempo real.

> Estado actual: **v2.0.0-stable** | Arquitectura Modular V3 | Entrypoint: src/server.js`n
---

## Caracteristicas

- Multi-Parser SMS: CT, KW y R0 con EBNF y AJV.
- Mapa en tiempo real via WebSockets (/ws).
- Ingesta SMS: POST /api/sms-gps.
- Integracion Hubble Network: webhooks seguros y /api/hubble/*.
- Geocercas con persistencia JSON.
- Exportacion Raw: /api/device/:id/raw-sms.
- Boton APAGAR/ENCENDER: pausa global del mapa sin detener el servidor.
- Alertas NTFY: si un equipo SMS lleva mas de 1 hora sin reportar.
- PWA instalable con Service Worker.
- SQLite con etter-sqlite3 y WAL.

---

## Arquitectura (V3)

`	ext
nexus-mithril-tracker/
|-- README.md
|-- data/                   # Config, aliases, geofences
|-- public/                 # Frontend PWA (fleet.html, diagnostico.html, sw.js)
|-- src/                    # Backend Fastify
|   |-- parsers/            # ct.js, kw.js, r0.js, index.js
|   |-- routes/             # gps_router, hubble-routes, config-routes, diagnostico-routes
|   |-- services/           # db, geofence, hubble-client, ws-broadcast
|   +-- server.js           # Entrypoint
|-- ecosystem.config.cjs    # PM2
|-- package.json
+-- tests/                  # node --test
` 

---

## Instalacion

### Requisitos

- Node.js 24.19.0 (ver .nvmrc)
- PM2 (
pm install -g pm2)

### Pasos

`ash
npm install
npm test
node src/server.js
` 

### Configurar credenciales

Copia .env.example a .env y completa sin commitear .env:

`ash
cp .env.example .env
` 

### Produccion con PM2

`ash
pm2 start src/server.js --name nexus-mithril-tracker
pm2 save
pm2 startup
` 

---

## Endpoints principales

| Metodo | Endpoint | Descripcion |
| --- | --- | --- |
| POST | /api/sms-gps | Ingesta de tramas SMS crudas |
| POST | /api/hubble/webhook | Webhook de Hubble Network |
| POST | /api/hubble/sync | Sincronizacion manual con Hubble |
| GET | /api/posiciones/latest | Ultima posicion de todos los equipos |
| GET | /api/posiciones/history | Historial de posiciones |
| GET | /api/device/:id/raw-sms | Tramas crudas por dispositivo |
| POST | /api/system/toggle | Pausar o reanudar el mapa |
| GET | /api/system/status | Estado de pausa |
| GET | /api/config | Configuracion activa |
| POST | /api/config | Actualizar configuracion |
| POST | /api/ntfy/send-sms | Enviar comando SMS via NTFY |
| WS | /ws | Canal WebSocket en vivo |

---

## Parsers soportados

| Familia | Archivo | Dispositivos |
| --- | --- | --- |
| **CT** | src/parsers/ct.js | CalAmp CT |
| **KW** | src/parsers/kw.js | ACCUM_ y S-LITROS |
| **R0** | src/parsers/r0.js | APP: + MID: |

El orquestador src/parsers/index.js detecta la familia y enruta la trama.

---

## Seguridad

- Nunca commitees .env, *.db, 	elemetry_history.jsonl, *.bak ni _archive en un repo publico.
- Rota hubbleApiKey, hubbleWebhookSecret y x-api-key si alguna vez estuvieron en git.
- Usa .env local y .env.example sin valores reales.

---

## Licencia

Uso estrictamente personal y privado. Desarrollado para **Transportes Garza Leal**.

