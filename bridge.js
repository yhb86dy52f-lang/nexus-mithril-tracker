const { parseAndValidate } = require('./parser_engine');

function parseAnySMS(rawString) {
    if (!rawString || typeof rawString !== 'string') {
        throw new Error('[INPUT_ERROR] Entrada vacía o inválida.');
    }
    
    // Validar con el motor DevSec (EBNF + Ajv)
    const validated = parseAndValidate(rawString);
    
    // Inyectar timestamp
    const result = { ...validated, timestamp: new Date().toISOString() };
    
    // Aplanar el objeto para mantener compatibilidad con los tests y el servidor
    if (result.telemetry) {
        if (result.telemetry.kw_data) Object.assign(result, result.telemetry.kw_data);
        if (result.telemetry.ct_data) Object.assign(result, result.telemetry.ct_data);
        if (result.telemetry.gps) Object.assign(result, result.telemetry.gps);
    }
    return result;
}

module.exports = { parseAnySMS };