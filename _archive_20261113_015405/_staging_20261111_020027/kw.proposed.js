'use strict';
// kw.proposed.js v2.0 — KW Fuel Parser

function parseKWText(text) {
  if (typeof text !== 'string') return null;
  if (!/accum_0/i.test(text) && !/esc_temp_0/i.test(text) && !/S-Litros/i.test(text)) return null;
  function getVal(re) {
    var m = text.match(re);
    return m ? parseInt(m[1], 10) : null;
  }
  return {
    accum0: getVal(/accum_0\s*[:=\s]\s*(-?\d+)/i),
    accum1: getVal(/accum_1\s*[:=\s]\s*(-?\d+)/i),
    temp0:  getVal(/esc_temp_0\s*[:=\s]\s*(-?\d+)/i),
    temp1:  getVal(/esc_temp_1\s*[:=\s]\s*(-?\d+)/i),
    lev0:   getVal(/esc_lev_0\s*[:=\s]\s*(-?\d+)/i),
    lev1:   getVal(/esc_lev_1\s*[:=\s]\s*(-?\d+)/i),
    rssi:   getVal(/rssi\s*[:=\s]\s*(-?\d+)/i),
    seq:    getVal(/seq_num\s*[:=\s]\s*(-?\d+)/i)
  };
}

function analyzeKWText(rawText) {
  try {
    var kw = parseKWText(rawText);
    if (!kw) return { ok: false, family: 'KW', error: 'no KW block' };
    return Object.assign({ ok: true, family: 'KW' }, kw, {
      columns: {
        temperatura: kw.temp0,
        voltaje: kw.accum0 ? kw.accum0 / 1000 : null,
        estado_sensores: kw.lev0 != null ? ('T1=' + kw.lev0 + 'L T2=' + (kw.lev1 || 0) + 'L') : null
      }
    });
  } catch (err) {
    return { ok: false, family: 'KW', error: err.message };
  }
}

module.exports = { parseKWText, analyzeKWText };
