// Parser R0 - Estatus - CORREGIDO v2
// Preserva: APP, RSSI COM:, GPS fix, sats. Agrega: MID/ESN, INP, voltaje, APN/IP, estado por voltaje.

function parseR0(input) {
  const raw = String(input || '');
  const m = (re) => { const v = raw.match(re); return v ? v[1] : null; };
  const appVer = m(/APP:(\d+)/i);
  const appRev = m(/APP:\d+\s+([^\s]+)/i);
  const rssi = (() => { const x = raw.match(/COM:(-?\d+)/i); return x ? parseInt(x[1], 10) : null; })();
  const gpsFix = m(/GPS:([^\s]+)/i);
  const sats = (() => { const x = raw.match(/GPS:[^\s]+\s+(\d+)/i); return x ? parseInt(x[1], 10) : null; })();
  const mid = m(/MID:\s*(\d+)/i) || m(/ESN:\s*(\d+)/i) || m(/E(\d{10})/) || null;
  const inp = m(/INP:([0-1]+)/i);
  // Voltaje: "12.6V" o "11.2V" - buscar el último V que sea voltaje de unidad (9-16V)
  let voltaje = null;
  const voltMatches = [...raw.matchAll(/(\d+\.\d+)V/gi)];
  if (voltMatches.length) {
    const last = parseFloat(voltMatches[voltMatches.length - 1][1]);
    if (last >= 5 && last <= 20) voltaje = last;
  }
  const latM = raw.match(/LAT:\s*([-]?\d+\.\d+)/i);
  const lonM = raw.match(/LON:\s*([-]?\d+\.\d+)/i);
  const lat = latM ? parseFloat(latM[1]) : null;
  const lon = lonM ? parseFloat(lonM[1]) : null;
  const apn = m(/internet\.itelcel\.com/i) ? 'internet.itelcel.com' : null;
  const ip = m(/(\d+\.\d+\.\d+\.\d+:\d+)/) || m(/(\d+\.\d+\.\d+\.\d+)/) || null;

  let estado = 'STATUS OK';
  if (voltaje !== null && voltaje < 10) estado = 'VOLTAJE BAJO';
  else if (rssi !== null && rssi < -100) estado = 'SEÑAL BAJA';
  else if (gpsFix && gpsFix.includes('NO')) estado = 'SIN GPS';

  return {
    family: 'R0',
    device: mid,
    esn: mid,
    mid: mid,
    estado,
    appVer,
    appRev,
    rssi,
    gpsFix,
    sats,
    inp,
    voltaje,
    voltU: voltaje,
    lat,
    lon,
    apn,
    ip,
  };
}
module.exports = { parseR0 };
