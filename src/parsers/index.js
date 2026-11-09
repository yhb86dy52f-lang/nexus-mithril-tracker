// Orquestador de Telemetría - CORREGIDO v2
// Ubicación canónica: _upgrade_v3/parsers/index.js
// Requiere ./ct.js, ./kw.js, ./r0.js (misma carpeta). No ./parsers/ct.js.
// _upgrade_v3/index.js es solo un wrapper que re-exporta este archivo para que diagnostico-routes no se rompa.

const { parseCT } = require('./ct.js');
const { parseKW } = require('./kw.js');
const { parseR0 } = require('./r0.js');

// F1 - Filtro puro: ¿esto tiene forma de bloque CalAmp? Si no, UNKNOWN, no intentar parsear.
function isGarbage(input) {
  const t = String(input || '').trim();
  if (!t) return true;
  const up = t.toUpperCase();
  if (/^(OK|ERROR|OK\s+OK|ERROR\s+OK)(\s*)$/.test(up)) return true;
  if (up === 'APP2:REV12335-REL') return true;
  return false;
}

function detectFamily(input) {
  const up = String(input).toUpperCase();
  // CT primero: E + 10 dígitos + FFFF es más específico que APP:. Si viene mixto APP+HEX, el HEX manda.
  if (/E\d{10}FFFF/.test(up)) return 'CT';
  // KW: tiene ACCUM_ o S-LITROS explícito
  if (up.indexOf('ACCUM_') !== -1 || up.indexOf('S-LITROS') !== -1) return 'KW';
  // R0: tiene APP: + MID: o APP: + COM:
  if (up.indexOf('APP:') !== -1 && (up.indexOf('MID:') !== -1 || up.indexOf('COM:') !== -1)) return 'R0';
  // CT fallback: HEX largo puro, sin letras de texto (sin APP:, sin GPS:, sin LAT:)
  const hexOnly = up.replace(/[^0-9A-F]/g, '');
  const hasText = /APP:|GPS:|LAT:|LON:|MID:|COM:|INP:/.test(up);
  if (!hasText && hexOnly.length >= 40) return 'CT';
  // GPS solo, ADC, LIS, etc. -> tratar como R0 estatus
  if (up.indexOf('GPS:') !== -1 || up.indexOf('#ADC') !== -1 || up.indexOf('LIS') !== -1) return 'R0';
  return 'R0';
}

function parseAnySMS(input) {
  const raw = String(input || '');
  if (isGarbage(raw)) {
    return { family: 'UNKNOWN', estado: 'BASURA / VACIO', error: 'F1: no tiene forma de bloque', original: raw.slice(0, 200) };
  }
  try {
    const family = detectFamily(raw);
    if (family === 'CT') return parseCT(raw);
    if (family === 'KW') return parseKW(raw);
    return parseR0(raw);
  } catch (e) {
    return { family: 'UNKNOWN', estado: 'ERROR PARSER', error: e.message, original: raw.slice(0, 200) };
  }
}

module.exports = { parseAnySMS, detectFamily, isGarbage };
