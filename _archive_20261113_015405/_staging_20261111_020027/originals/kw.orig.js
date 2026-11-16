// Parser KW - Combustible - CORREGIDO v2
// Preserva: accum_0 / accum_1 / S-Litros V1/V2. Agrega: ESN/MID, RSSI, LAT/LON, F1, formatos alternos.

function parseKW(input) {
  const raw = String(input || '');
  const get = (re) => { const m = raw.match(re); return m ? parseInt(m[1], 10) : null; };
  const getStr = (re) => { const m = raw.match(re); return m ? m[1] : null; };

  // Formatos alternos: accum_0=11369, accum_0: 11369, ACCUM_0 11369, accum_0 = 11369
  const accum0 = get(/accum_0\s*[:=\s]\s*(\d+)/i);
  const accum1 = get(/accum_1\s*[:=\s]\s*(\d+)/i);
  // S-Litros: S-Litros V1=500, S-Litros V1: 500, S-Litros V1 500, S-LITROS V1
  const lev1 = get(/S-Litros\s*V1\s*[:=\s]\s*(\d+)/i) ?? get(/S-Litros\s*1\s*[:=\s]\s*(\d+)/i) ?? 0;
  const lev2 = get(/S-Litros\s*V2\s*[:=\s]\s*(\d+)/i) ?? get(/S-Litros\s*2\s*[:=\s]\s*(\d+)/i) ?? 0;

  const esn = getStr(/MID:\s*(\d+)/i) || getStr(/ESN:\s*(\d+)/i) || getStr(/E(\d{10})/) || null;
  const rssi = get(/rssi\s*[:=\s]\s*(-?\d+)/i) ?? get(/COM:\s*(-?\d+)/i);
  const latM = raw.match(/LAT:\s*([-]?\d+\.\d+)/i);
  const lonM = raw.match(/LON:\s*([-]?\d+\.\d+)/i);
  const lat = latM ? parseFloat(latM[1]) : null;
  const lon = lonM ? parseFloat(lonM[1]) : null;

  const voltU = accum0 ? accum0 / 1000 : null;
  const voltG = accum1 ? accum1 / 1000 : null;
  let estado = 'COMBUSTIBLE OK';
  if (voltU !== null && voltU < 10) estado = 'VOLTAJE BAJO';
  else if (lev1 + lev2 === 0) estado = 'SIN LECTURA LITROS';

  return {
    family: 'KW',
    device: esn,
    esn: esn,
    mid: esn,
    voltU,
    voltG,
    litrosV1: lev1,
    litrosV2: lev2,
    litrosTotales: lev1 + lev2,
    rssi,
    lat,
    lon,
    estado,
  };
}
module.exports = { parseKW };
