NEXUS-MITHRIL MODO OSIRIS

Nuevo fleet: /osiris.html
Fleet clasico: /fleet.html (intacto, backup en fleet.html.bak_<fecha>)
Config: /osiris-config.js (cambia apiPositions, hub, refreshMs ahi)

Como abrir:
- Misma URL que usas para fleet.html, pero cambia fleet.html por osiris.html
- Ejemplo: http://TU-SERVIDOR:PUERTO/osiris.html

Que usa (gratis):
- CesiumJS Apache 2.0 - globo 3D
- Esri World Imagery - satelite a color, con atribucion en el globo
- Tu backend /api/positions + /ws - mismos datos que fleet.html
- USGS sismos publico

Si ves DEMO - SIN BACKEND, es que /api/positions no respondio. Revisa que el servicio este corriendo con pm2.
