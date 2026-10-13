require('dotenv').config();
const { createApp } = require('./app');
const db = require('./config/db');

const port = process.env.PORT || 3000;
db.init()
  .then(() => createApp().listen(port, () => console.log(`PetCare escuchando en el puerto ${port}`)))
  .catch((e) => { console.error('No se pudo iniciar:', e); process.exit(1); });
