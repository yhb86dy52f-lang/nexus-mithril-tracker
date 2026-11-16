const test = require('node:test');
const assert = require('node:assert');
const { parseAnySMS } = require('../bridge.js'); // Usamos el nuevo motor DevSec

test('Parser CT: Debe detectar FALLA y extraer c3E70', () => {
    const sms = '!E4672144079FFFFFF0100006AD7AD6F6AD7AD6F0F39DD9EC24A588B00000002005C11000014FFAB8F070700FFFF0400002C0E00000FE400003E7000003E70';
    const result = parseAnySMS(sms);
    
    assert.strictEqual(result.family, 'CT');
    assert.strictEqual(result.estado, 'FALLA');
    assert.strictEqual(result.c3E70, 2);
});

test('Parser KW: Debe extraer niveles de combustible (lev0, lev1)', () => {
    const sms = 'rssi=-75, hdop=0.9, accum_0=12737, accum_1=3908, esc_temp_0=22, esc_lev_0=6, esc_temp_1=30, esc_lev_1=875';
    const result = parseAnySMS(sms);
    
    assert.strictEqual(result.family, 'KW');
    assert.strictEqual(result.lev0, 6);
    assert.strictEqual(result.lev1, 875);
});