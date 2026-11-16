'use strict';
function parseKWText(text) {
  if (typeof text !== 'string') return null;
  if (!/accum_0/i.test(text) && !/esc_temp_0/i.test(text) && !/S-Litros/i.test(text)) return null;
  function getVal(re) { var m = text.match(re); return m ? parseInt(m[1], 10) : null; }
  var kw = {
    accum0: getVal(/accum_0\s*[:=\s]\s*(-?\d+)/i), accum1: getVal(/accum_1\s*[:=\s]\s*(-?\d+)/i),
    temp0: getVal(/esc_temp_0\s*[:=\s]\s*(-?\d+)/i), temp1: getVal(/esc_temp_1\s*[:=\s]\s*(-?\d+)/i),
    lev0: getVal(/esc_lev_0\s*[:=\s]\s*(-?\d+)/i), lev1: getVal(/esc_lev_1\s*[:=\s]\s*(-?\d+)/i),
    rssi: getVal(/rssi\s*[:=\s]\s*(-?\d+)/i)
  };
  var estado = 'KW OK';
  if (kw.lev0 != null) { estado = 'T1=' + kw.lev0 + 'L T2=' + (kw.lev1 || 0) + 'L'; }
  return {
    family: 'KW', tempC1: kw.temp0, tempC2: kw.temp1, voltU: kw.accum0 ? kw.accum0 / 1000 : null,
           voltG: kw.accum1 ? kw.accum1 / 1000 : null, estado: estado, rssi: kw.rssi };
}
function analyzeKWText(rawText) { try { return parseKWText(rawText); } catch (e) { return null; } }
module.exports = { parseKWText, analyzeKWText };
