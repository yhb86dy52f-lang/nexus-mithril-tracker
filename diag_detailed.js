"use strict";
const path = require("path");
const fs = require("fs");
console.log("=== DIAG DETALLADO ===");
try { console.log("pegjs version: " + require("pegjs/package.json").version); } catch (e) { console.log("ERROR require pegjs: " + e.message); }
try { console.log("ajv version: " + require("ajv/package.json").version); } catch (e) { console.log("ERROR require ajv: " + e.message); }
try { console.log("ajv-formats version: " + require("ajv-formats/package.json").version); } catch (e) { console.log("ERROR require ajv-formats: " + e.message); }
let bridge;
try {
  bridge = require("./bridge");
  console.log("bridge cargado OK");
} catch (e) {
  console.log("ERROR cargando bridge: " + e.message);
  console.log(e.stack);
  process.exit(2);
}
const casos = [
  { nombre: "CT", raw: "E1234567890FFFF0A1B2C3D" },
  { nombre: "KW", raw: "KW,1234567890,rssi=-87,bat=12.6,ign=1" },
  { nombre: "R0", raw: "R0,1234567890,GPS:25.5421,-103.4420,62.5,180" },
  { nombre: "MALFORMADO", raw: "MALFORMADO" }
];
for (const c of casos) {
  console.log("--- Probando " + c.nombre + " : " + c.raw + " ---");
  try {
    const out = bridge.parseAnySMS(c.raw);
    console.log("OK " + c.nombre + " family=" + out.family + " esn=" + out.esn);
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.log("ERROR " + c.nombre + " : " + e.message);
    console.log("Stack: " + e.stack);
  }
}
console.log("=== FIN DIAG ===");