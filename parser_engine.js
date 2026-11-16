const fs = require('fs');
const path = require('path');
const peggy = require('peggy');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const grammar = fs.readFileSync(path.join(__dirname, 'telemetry.ebnf'), 'utf8');
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'telemetry_schema.json'), 'utf8'));

const parser = peggy.generate(grammar);

// validateSchema: false evita el error de compilación con el Draft 2020-12
const ajv = new Ajv2020({ allErrors: true, strict: false, validateSchema: false });
addFormats(ajv);
const validate = ajv.compile(schema);

function parseAndValidate(rawSMS) {
    let parsed;
    try {
        parsed = parser.parse(rawSMS.trim());
    } catch (e) {
        // Concatenación simple en lugar de backticks (template literals)
        throw new Error('[SYNTAX_ERROR] ' + e.message);
    }
    const valid = validate(parsed);
    if (!valid) {
        const errorMsg = ajv.errorsText(validate.errors, { separator: ' | ' });
        throw new Error('[SCHEMA_ERROR] ' + errorMsg);
    }
    return parsed;
}

module.exports = { parseAndValidate };