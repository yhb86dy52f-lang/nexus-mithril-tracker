// Wrapper - NO modificar lógica aquí. La lógica vive en ./parsers/index.js
// diagnostico-routes.js hace require('../index.js'), por eso este archivo existe.
// Re-exporta el orquestador canónico de parsers/ para que no se rompa el ecosistema.
module.exports = require('./parsers/index.js');
