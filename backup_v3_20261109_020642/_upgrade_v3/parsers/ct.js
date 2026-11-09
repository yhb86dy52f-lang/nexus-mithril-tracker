// Parser para equipos CT (Temperatura)
function parseCT(input) {
  var clean = String(input).toUpperCase().replace(/[^0-9A-F]/g, '');
  var bytes = [];
  for (var i = 0; i < clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16));
  var u16 = [];
  for (var j = 0; j < bytes.length - 1; j += 2) u16.push((bytes[j] << 8) | bytes[j + 1]);

  var accum0 = null;
  // Buscar voltaje (rango 10-15V), EXCLUYENDO el código de falla 15984
  for (var k = u16.length - 1; k >= 0; k--) { 
    if (u16[k] >= 10000 && u16[k] < 15000 && u16[k] !== 15984) { 
      accum0 = u16[k]; break; 
    } 
  }
  
  var accum1 = null;
  for (var k2 = u16.length - 1; k2 >= 0; k2--) { 
    if (u16[k2] >= 3500 && u16[k2] <= 5000) { accum1 = u16[k2]; break; } 
  }
  
  var small = u16.filter(function(v) { return v > 0 && v < 1000; });
  var accum2 = small.length >= 2 ? small[small.length - 2] : (small[0] || null);
  var accum3 = small.length >= 2 ? small[small.length - 1] : null;

  var c3E70 = u16.filter(function(v) { return v === 0x3E70; }).length;
  var cFFFF = u16.filter(function(v) { return v === 0xFFFF; }).length;

  var estado = 'BUENO PERFECTO';
  if (c3E70 >= 2) estado = 'FALLA DOBLE TERMO';
  else if (c3E70 === 1) estado = 'FALLA SIMPLE RESIDUAL';
  else if (cFFFF >= 2) estado = 'OK DESHABILITADO';

  return {
    family: 'CT',
    estado: estado,
    voltU: accum0 ? accum0 / 1000 : null,
    voltG: accum1 ? accum1 / 1000 : null,
    tempC1: accum2 ? accum2 / 16 : null,
    tempC2: accum3 ? accum3 / 16 : null,
    fallas: c3E70
  };
}
module.exports = { parseCT };
