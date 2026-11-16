# STAGING 20261111_020027

Nada fue tocado en originales. Todo aquí para revisión.

## Archivos
- originals/ — backups
- ct.proposed.js — parser CT
- kw.proposed.js — parser KW
- schema.proposed.sql — ALTER TABLE
- PATCH_gps_router.txt — patrón
- EXTRACT.txt — código real

## Promoción
1. Revisar EXTRACT.txt
2. Copy-Item ct.proposed.js ../src/parsers/ct.js -Force
3. Copy-Item kw.proposed.js ../src/parsers/kw.js -Force
4. Ejecutar schema.proposed.sql en MySQL
5. Aplicar PATCH_gps_router.txt
6. npm start + test con SMS real

## Rollback
Copy-Item originals/ct.orig.js ../src/parsers/ct.js -Force
