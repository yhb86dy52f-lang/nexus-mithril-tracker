Parsers actualizados v2 - NEXUS-MITHRIL

Guardar tal cual en: C:\RUNEFORGE_V2_CORE\services\nexus-mithril-tracker\

- _upgrade_v3/parsers/ct.js
- _upgrade_v3/parsers/kw.js
- _upgrade_v3/parsers/r0.js
- _upgrade_v3/parsers/index.js (orquestador real, require ./ct.js)
- _upgrade_v3/parsers/test.js
- _upgrade_v3/index.js (wrapper de 2 lineas para diagnostico-routes.js)

Compat: parseAnySMS(input) -> { family, device/esn/mid, estado, ... }
F1: OK/ERROR/vacio -> UNKNOWN
