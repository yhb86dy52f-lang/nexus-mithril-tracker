$ErrorActionPreference = "Stop"
$Source = "C:\RUNEFORGE_V2_CORE\services\anduril-hubble"
$Dest = "C:\RUNEFORGE_V2_CORE\backups_anduril"
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm"
$ZipName = Join-Path $Dest "anduril-backup_$Date.zip"
$TempDir = Join-Path $env:TEMP "anduril_temp_backup"

# Limpiar temporal si existe
if (Test-Path $TempDir) { Remove-Item $TempDir -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Copiar usando robocopy (excluye node_modules y archivos temporales)
robocopy $Source $TempDir /E /XD node_modules /XF *.zip *.bak *.cjs /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null

# Comprimir
if (Test-Path "$TempDir\*") {
    Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipName -Force
}
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue

# Limpieza: Mantener solo los últimos 7 respaldos
$OldBackups = Get-ChildItem -Path $Dest -Filter "anduril-backup_*.zip" | Sort-Object CreationTime -Descending | Select-Object -Skip 7
if ($OldBackups) { $OldBackups | Remove-Item -Force }
