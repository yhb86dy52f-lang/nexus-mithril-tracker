# Auditoría del README.md

He auditado el archivo `README.md` que compartiste. Está muy bien redactado y estructurado, pero **contiene información desactualizada** que quedó de la era de `anduril-hubble` y de la versión `v1.0.0`.

### 🔍 Hallazgos (Inconsistencias detectadas)

1. **Versión incorrecta**: Dice `v1.0.0-stable`, pero en Fase 1 actualizamos el `package.json` a **`v2.0.0`** (para reflejar la nueva arquitectura consolidada).
2. **Nombre viejo en la arquitectura**: El árbol de texto dice `anduril-hubble/` en lugar de `nexus-mithril-tracker/`.
3. **Comando PM2 obsoleto**: Dice `pm2 start src/server.js --name anduril-hubble`. Debe ser `--name nexus-mithril-tracker`.
4. **Referencias a archivos movidos**: Menciona `monitor_sms.js` en la raíz (ese archivo ya no está allí tras la limpieza, o fue archivado).
5. **Nombre de la base de datos**: Menciona `data/nexus.db`, pero en la limpieza vimos que los archivos reales son `nexus_history.db` y `telemetry_history.jsonl` en la raíz.
6. **Tareas programadas**: Menciona `NEXUS-MonitorSMS`, pero acabamos de crear `Nexus_Mithril_Backup`.

---

# README.md Actualizado y Limpio (v2.0.0)

Aquí tienes el contenido corregido. Copia y pega este bloque en tu consola para sobrescribir el `README.md` con la versión definitiva y ordenada.

```powershell
$readmePath = 'C:\RUNEFORGE_V2_CORE\services\nexus-mithril-tracker\README.md'
$readmeContent = @'
# NEXUS-MITHRIL Tracker

Sistema de rastreo y telemetria de flotas basado en ingesta de tramas SMS (formato CalAmp) con soporte multi-protocolo, geocercas y visualizacion en tiempo real.

> Estado actual: **v2.0.0-stable** | Arquitectura Modular V3 | Auditoria: **HEALTHY**

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
nexus-mithril-tracker/
|-- README.md
|-- data/                   # Config, aliases, geofences
|-- public/                 # Frontend PWA (fleet.html, diagnostico.html, sw.js, raw_logs.js)
|-- src/                    # Backend modular (Fastify)
|   |-- parsers/            # ct.js, kw.js, r0.js, index.js
|   |-- routes/             # gps_router, hubble-routes, config-routes, diagnostico-routes
|   |-- services/           # db, geofence, hubble-client, ws-broadcast
|   +-- server.js           # Entrypoint
|-- ecosystem.config.cjs    # Configuracion PM2
|-- nexus_history.db        # Base de datos SQLite
|-- telemetry_history.jsonl # Historial de telemetria
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
Edita `.env` o `data/config.json`:
```json
{
  "hubbleApiKey": "TU_API_KEY",
  "hubbleOrgId": "TU_ORG_ID",
  "hubbleWebhookSecret": "TU_SECRETO"
}
```

### Produccion con PM2
```bash
pm2 start src/server.js --name nexus-mithril-tracker
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

## Proteccion y Respaldos

- **Base de datos**: `nexus_history.db` con WAL habilitado.
- **Rama `stable`**: Protegida en GitHub con Rulesets (solo PRs aprobados).
- **Tag `v2.0.0-stable`**: Inmutable, version base certificada (Migracion Nexus).
- **Hook local**: Bloquea push accidentales a `stable` desde esta maquina.
- **Backups**: Tarea programada `Nexus_Mithril_Backup` (diaria a las 3:00 AM) y `.zip` manuales en `C:\RUNEFORGE_V2_CORE\backups\`.

---

## Scripts de Auditoria

Ubicados en `C:\RUNEFORGE_V2_CORE\scripts\`:

| Script | Proposito |
| :--- | :--- |
| `verificar_integridad.ps1` | Compara codigo local contra `v2.0.0-stable` |
| `blindar_canonico.ps1` | Instala/verifica hook de proteccion |
| `diagnose-hubble.ps1` | Diagnostico de salud del servicio (Legacy name, updated paths) |

---

## Licencia

Uso estrictamente personal y privado. Desarrollado para **Transportes Garza Leal**.

---

*Desarrollado con esfuerzo, sudor y logica de Comandante. Migrado a Nexus-Mithril.*
'@
Set-Content -Path $readmePath -Value $readmeContent -Encoding UTF8 -Force
"README.md actualizado a la version v2.0.0 y arquitectura Nexus-Mithril."
```

---

### ¿Qué se corrigió?
1. **Título y Versión**: Ahora dice `v2.0.0-stable`.
2. **Rutas**: Cambió `anduril-hubble/` por `nexus-mithril-tracker/`.
3. **PM2**: El comando de producción ahora arranca con el nombre correcto.
4. **Estructura**: Se alineó el árbol de archivos con la limpieza real que acabamos de hacer (raíz limpia, DBs en la raíz, config de PM2 incluida).
5. **Tareas**: Se actualizó la referencia de backups a la tarea `Nexus_Mithril_Backup` que creamos hoy.

Con esto, tu documentación queda perfectamente sincronizada con el código real. La auditoría de la carpeta, la limpieza y la actualización de la documentación están **100% completadas**.