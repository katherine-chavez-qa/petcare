require('dotenv').config();
const db = require('../src/config/db');
db.init().then(() => { console.log('Esquema creado/actualizado.'); return db.close(); })
  .catch((e) => { console.error(e); process.exit(1); });
