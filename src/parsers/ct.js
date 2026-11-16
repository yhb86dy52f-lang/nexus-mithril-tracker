'use strict';
// ct.js v3.0 - Búsqueda directa en string (inmune a desalineación)

function cleanHex(s) {
  if (typeof s !== 'string') return '';
  var c = s.replace(/!/g, '').replace(/\s+/g, '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (c.length % 2 === 1) c += '0'; // Añadir 0 al final
  return c;
}

function extractHexBlock(text) {
  if (typeof text !== 'string') return null;
  var m = text.match(/!\s*E\d{10}F{4,}/i);
  if (!m) return null;
  var rest = text.substring(m.index);
  var block = '';
  for (var i = 0; i < rest.length; i++) {
    var c = rest[i];
    if (/[0-9A-Fa-f\-!\s]/.test(c)) block += c; else break;
  }
  var clean = block.replace(/[!\-\s]/g, '').toUpperCase();
  if (!/^E\d{10}/.test(clean)) return null;
  if (clean.length % 2 === 1) clean += '0';
  return clean;
}

function parseCTFrame(cleanHexStr) {
  if (!cleanHexStr || cleanHexStr.length < 8) return null;
  
  // Búsqueda en string directa (ignora bytes y alineación)
  var c3E70 = (cleanHexStr.match(/3E70/g) || []).length;
  var cFFFF = (cleanHexStr.match(/FFFF/g) || []).length;

  // Extracción de bytes para voltajes y temperaturas
  var bytes = [];
  for (var i = 0; i < cleanHexStr.length; i += 2) bytes.push(parseInt(cleanHexStr.substr(i, 2), 16));
  var u16 = [];
  for (var j = 0; j < bytes.length - 1; j += 2) u16.push((bytes[j] << 8) | bytes[j + 1]);
  
  var voltU = null;
  for (var k = u16.length - 1; k >= 0; k--) {
    if (u16[k] >= 10000 && u16[k] < 15000 && u16[k] !== 15984) { voltU = u16[k]; break; }
  }
  var voltG = null;
  for (var k2 = u16.length - 1; k2 >= 0; k2--) {
    if (u16[k2] >= 3500 && u16[k2] <= 5000) { voltG = u16[k2]; break; }
  }
  
  var small = u16.filter(function (v) { return v > 0 && v < 1000; });
  var accum2 = small.length >= 2 ? small[small.length - 2] : (small[0] || null);
  var accum3 = small.length >= 2 ? small[small.length - 1] : null;
  var tempC1 = accum2 ? accum2 / 16 : null;
  var tempC2 = accum3 ? accum3 / 16 : null;
  
  var estado;
  if (c3E70 >= 2) { estado = 'FALLA DOBLE TERMO'; }
  else if (c3E70 === 1) { estado = 'BUENO RESIDUAL'; }
  else if (cFFFF >= 2) { estado = 'OK DESHABILITADO'; }
  else { estado = 'BUENO PERFECTO'; }

  return {
    family: 'CT', 
    tempC1: tempC1, 
    tempC2: tempC2, 
    voltU: voltU, 
    voltG: voltG, 
    estado: estado,
    rawLen: cleanHexStr.length
  };
}

function analyzeCTText(rawText) {
  try {
    var cleanHex = extractHexBlock(rawText);
    if (!cleanHex) return null;
    var esnMatch = rawText.match(/!\s*E(\d{10})/i);
    var esn = esnMatch ? esnMatch[1] : null;
    var frame = parseCTFrame(cleanHex);
    if (!frame) return null;
    return Object.assign({}, frame, { esn: esn });
  } catch (err) {
    return null;
  }
}

module.exports = { cleanHex, extractHexBlock, parseCTFrame, analyzeCTText };
