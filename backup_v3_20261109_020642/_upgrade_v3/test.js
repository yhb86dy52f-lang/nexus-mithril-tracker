const { parseAnySMS } = require('./index.js');

console.log("=== PRUEBAS DEL ENTORNO SANITIZADO ===\n");

// Prueba 1: CT 254 con falla (3E70)
const ctHex = "E7000276167FFFFF-F0100006AE0506E6AE0506E0C3440B9-C380858200000002001-C12020014FFA20-F064600FFF-F04000000000000-F1800003E7000003E70";
console.log("1. PRUEBA CT (Falla 3E70):");
console.log(JSON.stringify(parseAnySMS(ctHex), null, 2));

// Prueba 2: KW 761 (Combustible)
const kwText = "rssi=-57, accum_0=11369, accum_1=4070, S-Litros V1=500, S-Litros V2=250";
console.log("\n2. PRUEBA KW (Combustible):");
console.log(JSON.stringify(parseAnySMS(kwText), null, 2));

// Prueba 3: R0 (Estatus)
const r0Text = "APP:445 8.7b COM:-87 DA. INTERNET.ITELCEL.COM GPS:3D-RTIME 17 INP:0000000000000111 11.2V MID:4672144079 ESN";
console.log("\n3. PRUEBA R0 (Estatus):");
console.log(JSON.stringify(parseAnySMS(r0Text), null, 2));
