// Servidor de demostración local SIN instalar PostgreSQL: usa PGlite (Postgres en memoria) con datos semilla.
// Uso: npm run demo   -> http://localhost:3100  (los datos se pierden al detenerlo)
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'demo';
const { seed, ADMIN_EMAIL, ADMIN_PASS } = require('../db/seed');
const { createApp } = require('../src/app');

seed({ reset: true }).then(() => {
  createApp().listen(3100, () => console.log(`Demo en http://localhost:3100  (${ADMIN_EMAIL} / ${ADMIN_PASS})`));
});
