-- schema.proposed.sql
-- Verificar nombres de tabla/columnas en EXTRACT.txt antes de aplicar.
-- MySQL 8+ soporta IF NOT EXISTS en ADD COLUMN.

ALTER TABLE posiciones
  ADD COLUMN IF NOT EXISTS temperatura DECIMAL(6,2) NULL,
  ADD COLUMN IF NOT EXISTS voltaje DECIMAL(5,2) NULL,
  ADD COLUMN IF NOT EXISTS estado_sensores VARCHAR(64) NULL;

SELECT COUNT(*) AS total,
       SUM(temperatura IS NOT NULL) AS con_temp,
       SUM(estado_sensores IS NOT NULL AND estado_sensores != '') AS con_estado
FROM posiciones;
