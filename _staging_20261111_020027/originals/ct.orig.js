// Parser CT - Temperatura - CORREGIDO v2
// Preserva lógica original: voltU 10000-15000 excluyendo 15984 (3E70), voltG 3500-5000, temp /16, falla 3E70.
// Corrige: F1, ESN/MID, timestamp, guiones de salto de línea, off-by-one, no confundir texto APP con HEX.

function extractESN(input) {
  const m = String(input).match(/E(\d{10})/) || String(input).match(/MID:\s*(\d{10})/i) || String(input).match(/ESN:\s*(\d{10})/i);
  return m ? m[1] : null;
}

function extractTimestamp(u16, bytes) {
  // En HEX CT, después de ESN + FFFF viene: F010000 + timestamp (4 bytes) + timestamp duplicado
  // Intentamos leer primer u32 después del header como Unix.
  // bytes ya es array de bytes limpios.
  try {
    if (bytes.length >= 12) {
      // Buscar patrón F0 10 00 00 o F0 10 ... - el timestamp está 4 bytes después de F0 10 00 00
      for (let i = 0; i < bytes.length - 8; i++) {
        if (bytes[i] === 0xF0 && bytes[i+1] === 0x10) {
          const ts = (bytes[i+4] << 24) | (bytes[i+5] << 16) | (bytes[i+6] << 8) | bytes[i+7];
          if (ts > 1500000000 && ts < 2000000000) {
            return { ts, iso: new Date(ts * 1000).toISOString() };
          }
        }
      }
    }
  } catch (e) {}
  return { ts: null, iso: null };
}

function parseCT(input) {
  const raw = String(input || '');
  const esn = extractESN(raw);

  // F1 + alineación: si viene texto mixto (APP: + HEX), quedarse solo con el bloque HEX que empieza en E + 10 dígitos + FFFF.
  // IMPORTANTE: NO quitar E+ESN. El stream HEX original INCLUYE E+ESN como primeros bytes (E7 00 02...).
  // Si lo quitamos, se desplaza 11 nibbles (impar) y los u16 ya no alinean y se pierde 3E70 / voltajes.
  let hexPart = raw;
  const hexBlock = raw.match(/E\d{10}FFFF[0-9A-F\s\-]+/i);
  if (hexBlock) hexPart = hexBlock[0];
  // Quitar guión de fin de línea, espacios, y todo lo que no sea HEX (igual que el parser original)
  let clean = hexPart.toUpperCase().replace(/[^0-9A-F]/g, '');

  // Si longitud impar, pad con 0 al final (antes se perdía el último byte por off-by-one)
  if (clean.length % 2 === 1) clean += '0';

  const bytes = [];
  for (let i = 0; i < clean.length; i += 2) {
    const v = parseInt(clean.slice(i, i + 2), 16);
    if (Number.isFinite(v)) bytes.push(v);
  }

  const u16 = [];
  for (let j = 0; j + 1 < bytes.length; j += 2) u16.push((bytes[j] << 8) | bytes[j + 1]);

  let accum0 = null;
  for (let k = u16.length - 1; k >= 0; k--) {
    if (u16[k] >= 10000 && u16[k] < 15000 && u16[k] !== 15984) { accum0 = u16[k]; break; }
  }
  let accum1 = null;
  for (let k2 = u16.length - 1; k2 >= 0; k2--) {
    if (u16[k2] >= 3500 && u16[k2] <= 5000) { accum1 = u16[k2]; break; }
  }

  const small = u16.filter((v) => v > 0 && v < 1000);
  const accum2 = small.length >= 2 ? small[small.length - 2] : (small[0] || null);
  const accum3 = small.length >= 2 ? small[small.length - 1] : null;

  const c3E70 = u16.filter((v) => v === 0x3E70).length;
  const cFFFF = u16.filter((v) => v === 0xFFFF).length;

  let estado = 'BUENO PERFECTO';
  if (c3E70 >= 2) estado = 'FALLA DOBLE TERMO';
  else if (c3E70 === 1) estado = 'FALLA SIMPLE RESIDUAL';
  else if (cFFFF >= 2) estado = 'OK DESHABILITADO';

  const { ts, iso } = extractTimestamp(u16, bytes);

  return {
    family: 'CT',
    device: esn,
    esn: esn,
    mid: esn,
    timestamp: ts,
    timestampISO: iso,
    estado: estado,
    voltU: accum0 ? accum0 / 1000 : null,
    voltG: accum1 ? accum1 / 1000 : null,
    tempC1: accum2 ? accum2 / 16 : null,
    tempC2: accum3 ? accum3 / 16 : null,
    fallas: c3E70,
    ffffCount: cFFFF,
    hexCleanLen: clean.length,
    // Compat: campos que espera diagnostico / export
    rssi: null,
    lat: null,
    lon: null,
  };
}
module.exports = { parseCT };
