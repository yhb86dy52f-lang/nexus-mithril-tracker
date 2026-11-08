// Parser para equipos KW (Combustible)
function parseKW(input) {
  var get = function(re) { var m = input.match(re); return m ? parseInt(m[1]) : null; };
  var accum0 = get(/accum_0\s*[:=]\s*(\d+)/i);
  var accum1 = get(/accum_1\s*[:=]\s*(\d+)/i);
  var lev1 = get(/S-Litros V1\s*[:=]\s*(\d+)/i) || 0;
  var lev2 = get(/S-Litros V2\s*[:=]\s*(\d+)/i) || 0;
  
  return {
    family: 'KW',
    voltU: accum0 ? accum0 / 1000 : null,
    voltG: accum1 ? accum1 / 1000 : null,
    litrosTotales: lev1 + lev2,
    estado: 'COMBUSTIBLE OK'
  };
}
module.exports = { parseKW };
