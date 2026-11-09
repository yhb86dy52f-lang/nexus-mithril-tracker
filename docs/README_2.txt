Paneles corregidos v3 - NEXUS-MITHRIL

- fleet.html: export raw con selector CSV/JSON/TXT, Blob, sin API key hardcodeada, flujo same-origin -> /api/export/raw
- diagnostico.html: misma interfaz, upgrade visual, chips de ejemplo, contador, KPIs, sin API key, flujo -> /api/diagnostico/parse

Reemplazar en: C:\RUNEFORGE_V2_CORE\services\nexus-mithril-tracker\public\
Requiere server.js v2 + db.js v2 + routers Tanda 2 para que el flujo no se rompa.
