# NEXUS-MITHRIL Tracker

Sistema de rastreo y telemetria de flotas basado en ingesta de tramas SMS (formato CalAmp) con soporte multi-protocolo, geocercas y visualizacion en tiempo real.

> Estado actual: **v1.0.0-stable** | Arquitectura Modular V3 | Auditoria: **HEALTHY**

---

## Caracteristicas Principales

- **Multi-Parser SMS**: Decodificacion automatica de tramas CalAmp para dispositivos CT, KW y R0.
- **Mapa en Tiempo Real**: Actualizaciones instantaneas via WebSockets (`/ws`).
- **Ingesta SMS**: Endpoint `POST /api/sms-gps` para recibir tramas crudas del gateway celular.
- **Integracion Hubble Network**: Webhooks seguros (`x-hubble-token`) y sincronizacion con Hubble (`/api/hubble/*`).
- **Geocercas**: Calculo y validacion de zonas geograficas con persistencia JSON.
- **Exportacion Raw**: Descarga de tramas crudas por dispositivo (`/api/device/:id/raw-sms`).
- **Boton APAGAR/ENCENDER**: Pausa global del mapa sin detener el servidor.
- **Alertas NTFY**: Notificacion push al celular si un equipo SMS lleva mas de 1 hora sin reportar.
- **PWA (Progressive Web App)**: Instalable en iOS/Android con soporte offline via Service Worker.
- **SQLite**: Almacenamiento local de alta velocidad con `better-sqlite3` (WAL habilitado).

---

## Arquitectura (V3)

La arquitectura V3 separa las responsabilidades en capas limpias. El application root es este directorio:

```text
anduril-hubble/
|-- README.md
|-- data/                   # Config, aliases, geofences, SQLite DB
|-- public/                 # Frontend PWA (fleet.html, diagnostico.html, sw.js, raw_logs.js)
|-- src/                    # Backend modular (Fastify)
|   |-- parsers/            # ct.js, kw.js, r0.js, index.js
|   |-- routes/             # gps_router, hubble-routes, config-routes, diagnostico-routes
|   |-- services/           # db, geofence, hubble-client, ws-broadcast
|   +-- server.js           # Entrypoint
|-- monitor_sms.js          # Motor de monitoreo NTFY
+-- package.json
```

---

## Instalacion

### Requisitos
- Node.js v18+ (probado en v24)
- SQLite (incluido via `better-sqlite3`)
- PM2 (`npm install -g pm2`)

### Pasos
```bash
npm install
node src/server.js
```

### Configurar Credenciales
Edita `data/config.json`:
```json
{
  "hubbleApiKey": "TU_API_KEY",
  "hubbleOrgId": "TU_ORG_ID",
  "hubbleWebhookSecret": "TU_SECRETO"
}
```

### Produccion con PM2
```bash
pm2 start src/server.js --name anduril-hubble
pm2 save
pm2 startup
```

---

## Endpoints Principales

| Metodo | Endpoint | Descripcion |
| :--- | :--- | :--- |
| `POST` | `/api/sms-gps` | Ingesta de tramas SMS crudas |
| `POST` | `/api/hubble/webhook` | Webhook de Hubble Network |
| `POST` | `/api/hubble/sync` | Forzar sincronizacion manual con Hubble |
| `GET`  | `/api/posiciones/latest` | Ultima posicion de todos los equipos |
| `GET`  | `/api/posiciones/history` | Historial de posiciones |
| `GET`  | `/api/device/:id/raw-sms` | Historial de tramas crudas por dispositivo |
| `POST` | `/api/system/toggle` | Pausar/Reanudar el flujo visual del mapa |
| `GET`  | `/api/system/status` | Consultar estado de pausa |
| `GET`  | `/api/config` | Obtener configuracion activa |
| `POST` | `/api/config` | Actualizar configuracion |
| `POST` | `/api/ntfy/send-sms` | Enviar comando SMS via NTFY |
| `WS`   | `/ws` | Canal WebSocket para actualizaciones en vivo |

---

## Parsers Soportados

| Familia | Archivo | Dispositivos |
| :--- | :--- | :--- |
| **CT** | `src/parsers/ct.js` | CalAmp CT (tramas hex largas) |
| **KW** | `src/parsers/kw.js` | Dispositivos con `ACCUM_` / `S-LITROS` |
| **R0** | `src/parsers/r0.js` | Dispositivos con `APP:` + `MID:` |

El orquestador `src/parsers/index.js` detecta automaticamente la familia y enruta la trama al parser correcto.

---

## Monitoreo Automatico (NTFY)

`monitor_sms.js` revisa la base de datos y envia alertas a NTFY si algun equipo SMS lleva mas de 60 minutos sin reportar.

```bash
node monitor_sms.js
```

Automatizado via tarea programada `NEXUS-MonitorSMS` (cada 15 minutos).

---

## Proteccion y Respaldos

- **Base de datos**: `data/nexus.db` con WAL habilitado.
- **Rama `stable`**: Protegida en GitHub con Rulesets (solo PRs aprobados).
- **Tag `v1.0.0-stable`**: Inmutable, version base certificada.
- **Hook local**: Bloquea push accidentales a `stable` desde esta maquina.
- **Backups**: `.zip` con base de datos y secretos en `C:\RUNEFORGE_V2_CORE\backups\`.

---

## Scripts de Auditoria

Ubicados en `C:\RUNEFORGE_V2_CORE\scripts\`:

| Script | Proposito |
| :--- | :--- |
| `verificar_integridad.ps1` | Compara codigo local contra `v1.0.0-stable` |
| `blindar_canonico.ps1` | Instala/verifica hook de proteccion |
| `monitor_sms.ps1` | Lanzador del motor de alertas NTFY |

---

## Licencia

Uso estrictamente personal y privado. Desarrollado para **Transportes Garza Leal**.

---

*Desarrollado con esfuerzo, sudor y logica de Comandante.*