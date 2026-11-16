const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data'); // Ruta corregida: dentro de nexus-mithril-tracker
const dbPath = path.join(dataDir, 'nexus.db');
const backupDir = 'C:\\RUNEFORGE_V2_CORE\\backups';

// 1. Crear copia de seguridad
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupPath = path.join(backupDir, `nexus_${timestamp}.db`);

if (fs.existsSync(dbPath)) {
    const db = new Database(dbPath);
    
    // Realizar backup en caliente (sin cerrar la conexión del servidor)
    db.backup(backupPath)
      .then(() => {
          console.log(`[BACKUP] Copia creada en: ${backupPath}`);
          
          // 2. Limpiar registros antiguos (más de 30 días)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const isoDate = thirtyDaysAgo.toISOString();
          
          const info = db.prepare(`DELETE FROM posiciones WHERE timestamp < ?`).run(isoDate);
          console.log(`[LIMPIEZA] Registros eliminados: ${info.changes}`);
          
          // 3. Compactar la base de datos (VACUUM)
          db.exec('VACUUM');
          console.log('[VACUUM] Base de datos compactada.');
          
          db.close();
          process.exit(0);
      })
      .catch((err) => {
          console.error('[ERROR] Falló el backup:', err.message);
          db.close();
          process.exit(1);
      });
} else {
    console.log('[ERROR] No se encontró la base de datos en:', dbPath);
    process.exit(1);
}