// Orquestador de Telemetría
const { parseCT } = require('./parsers/ct.js');
const { parseKW } = require('./parsers/kw.js');
const { parseR0 } = require('./parsers/r0.js');

function detectFamily(input) {
  var up = String(input).toUpperCase();
  if (up.indexOf('ACCUM_') !== -1 || up.indexOf('S-LITROS') !== -1) return 'KW';
  if (up.indexOf('APP:') !== -1 && up.indexOf('MID:') !== -1) return 'R0';
  if (up.replace(/[^0-9A-F]/g, '').length >= 40) return 'CT';
  return 'R0';
}

function parseAnySMS(input) {
  var family = detectFamily(input);
  if (family === 'CT') return parseCT(input);
  if (family === 'KW') return parseKW(input);
  return parseR0(input);
}

module.exports = { parseAnySMS, detectFamily };
