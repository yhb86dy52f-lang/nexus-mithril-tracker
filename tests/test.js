const { parseAnySMS, detectFamily } = require('../src/parsers/index.js');

function assert(cond, msg) {
  if (!cond) { console.error('❌ FAIL:', msg); process.exitCode = 1; }
  else console.log('✅ OK:', msg);
}

console.log("=== PRUEBAS DEL ENTORNO SANITIZADO - v2 ===\n");

// Prueba 1: CT 254 con falla (3E70) - HEX con guiones de salto de línea
const ctHex = "E7000276167FFFFF-F0100006AE0506E6AE0506E0C3440B9-C380858200000002001-C12020014FFA20-F064600FFF-F04000000000000-F1800003E7000003E70";
console.log("1. PRUEBA CT (Falla 3E70):");
const ct = parseAnySMS(ctHex);
console.log(JSON.stringify(ct, null, 2));
assert(ct.family === 'CT', 'CT family');
assert(ct.esn === '7000276167', 'CT esn 7000276167');
assert(ct.fallas === 2, 'CT fallas 2');
assert(ct.estado === 'FALLA DOBLE TERMO', 'CT estado FALLA DOBLE TERMO');
assert(ct.voltU !== null && ct.voltU > 10 && ct.voltU < 15, 'CT voltU en rango 10-15V');

// Prueba 2: KW 761 (Combustible)
const kwText = "rssi=-57, accum_0=11369, accum_1=4070, S-Litros V1=500, S-Litros V2=250";
console.log("\n2. PRUEBA KW (Combustible):");
const kw = parseAnySMS(kwText);
console.log(JSON.stringify(kw, null, 2));
assert(kw.family === 'KW', 'KW family');
assert(kw.voltU === 11.369, 'KW voltU 11.369');
assert(kw.voltG === 4.07, 'KW voltG 4.07');
assert(kw.litrosTotales === 750, 'KW litros 750');

// Prueba 3: R0 (Estatus)
const r0Text = "APP:445 8.7b COM:-87 DA. INTERNET.ITELCEL.COM GPS:3D-RTIME 17 INP:0000000000000111 11.2V MID:4672144079 ESN";
console.log("\n3. PRUEBA R0 (Estatus):");
const r0 = parseAnySMS(r0Text);
console.log(JSON.stringify(r0, null, 2));
assert(r0.family === 'R0', 'R0 family');
assert(r0.appVer === '445', 'R0 appVer 445');
assert(r0.rssi === -87, 'R0 rssi -87');
assert(r0.mid === '4672144079', 'R0 mid');
assert(r0.voltaje === 11.2, 'R0 voltaje 11.2');

// Prueba 4: F1 - basura
console.log("\n4. PRUEBA F1 (basura):");
const basura = parseAnySMS("OK");
console.log(JSON.stringify(basura, null, 2));
assert(basura.family === 'UNKNOWN', 'F1 OK -> UNKNOWN');

// Prueba 5: CT con texto mixto (APP + HEX) no debe confundir APP:445 como HEX
console.log("\n5. PRUEBA CT mixto:");
const mixto = "APP:445 8.7b COM:-71 MID:7000276167 ESN ! E7000276167FFFFF-F0100006AE050776AE05077-0B904061C5CF-F2960000000200EB0-B020014FFA34F0D1E00FFF-F040000321C00000-F580020001E00000400";
const ct2 = parseAnySMS(mixto);
console.log(JSON.stringify(ct2, null, 2));
assert(ct2.family === 'CT', 'Mixto detecta CT por E+FFFF');
assert(ct2.esn === '7000276167', 'Mixto esn');

console.log("\n=== FIN PRUEBAS ===");
if (!process.exitCode) console.log("Todas las pruebas pasaron ✅");
