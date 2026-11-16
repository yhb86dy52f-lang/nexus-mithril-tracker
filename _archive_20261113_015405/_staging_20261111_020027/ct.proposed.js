'use strict';
// ct.proposed.js v2.0 — CT Thermo Parser con columns helper
// Mantiene backward compat: cleanHex, parseCTFrame
// Añade: analyzeCTText() que devuelve { columns: { temperatura, voltaje, estado_sensores } }

function cleanHex(s) {
  if (typeof s !== 'string') return '';
  var c = s.replace(/!/g, '').replace(/\s+/g, '').replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  if (c.length % 2 === 1) c += '0';
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

function extractESN(clean) {
  var m = clean.match(/^E(\d{10})/);
  return m ? m[1] : null;
}

function parseCTFrame(cleanHexStr) {
  if (!cleanHexStr || cleanHexStr.length < 8) return null;
  var bytes = [];
  for (var i = 0; i < cleanHexStr.length; i += 2) bytes.push(parseInt(cleanHexStr.substr(i, 2), 16));
  var u16 = [];
  for (var j = 0; j < bytes.length - 1; j += 2) u16.push((bytes[j] << 8) | bytes[j + 1]);
  var c3E70 = u16.filter(function (v) { return v === 0x3E70; }).length;
  var cFFFF = u16.filter(function (v) { return v === 0xFFFF; }).length;
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
  var estado, badge, reco;
  if (c3E70 >= 2) {
    estado = 'FALLA DOBLE TERMO'; badge = 'fail';
    reco = 'Revisar manguera corrugada. Medir Blanco-Negro 10k-15k ohm. Pull-up 4.7k.';
  } else if (c3E70 === 1) {
    estado = 'BUENO RESIDUAL'; badge = 'warn';
    reco = 'Limpiar con !R3,70,0 y monitorear 2 viajes.';
  } else if (cFFFF >= 2) {
    estado = 'OK DESHABILITADO'; badge = 'ok';
    reco = 'Deshabilitado en firmware. No es falla.';
  } else {
    estado = 'BUENO PERFECTO'; badge = 'ok';
    reco = 'Sin 3E70 ni FFFF.';
  }
  return { u16: u16, c3E70: c3E70, cFFFF: cFFFF, voltU: voltU, voltG: voltG,
           tempC1: tempC1, tempC2: tempC2, accum2: accum2, accum3: accum3,
           estado: estado, badge: badge, reco: reco, rawLen: cleanHexStr.length };
}

function analyzeCTText(rawText) {
  try {
    var cleanHex = extractHexBlock(rawText);
    if (!cleanHex) return { ok: false, family: 'CT', error: 'no CT hex block' };
    var esn = extractESN(cleanHex);
    var frame = parseCTFrame(cleanHex);
    if (!frame) return { ok: false, family: 'CT', esn: esn, error: 'parse failed' };
    return Object.assign({ ok: true, family: 'CT', esn: esn }, frame, {
      columns: {
        temperatura: frame.tempC1,
        voltaje: frame.voltU ? frame.voltU / 1000 : null,
        estado_sensores: frame.estado
      }
    });
  } catch (err) {
    return { ok: false, family: 'CT', error: err.message };
  }
}

module.exports = { cleanHex, extractHexBlock, extractESN, parseCTFrame, analyzeCTText };
