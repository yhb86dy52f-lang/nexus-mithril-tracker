// Parser para equipos R0 (Estatus)
function parseR0(input) {
  var m = function(re) { var v = input.match(re); return v ? v[1] : null; };
  return {
    family: 'R0',
    estado: 'STATUS OK',
    appVer: m(/APP:(\d+)/i),
    appRev: m(/APP:\d+\s+([^\s]+)/i),
    rssi: (function() { var x = input.match(/COM:(-?\d+)/i); return x ? parseInt(x[1]) : null; })(),
    gpsFix: m(/GPS:([^\s]+)/i),
    sats: (function() { var x = input.match(/GPS:[^\s]+\s+(\d+)/i); return x ? parseInt(x[1]) : null; })()
  };
}
module.exports = { parseR0 };
