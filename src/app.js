const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const db = require('./config/db');
const { flash, csrf } = require('./middleware/common');

function createApp() {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  if (isProd) app.set('trust proxy', 1);

  // Formateadores para las vistas
  app.locals.fmtFecha = (s) => (s ? String(s).slice(0, 10).split('-').reverse().join('/') : '');
  app.locals.fmtHora = (s) => (s ? String(s).slice(0, 5) : '');

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        formAction: ["'self'"],
      },
    },
  }));
  app.use(express.urlencoded({ extended: false }));
  app.use('/public', express.static(path.join(__dirname, '../public')));

  // Sesiones persistentes en PostgreSQL (sobreviven a reinicios de Render)
  let store;
  if (db.getPool() && process.env.NODE_ENV !== 'test') {
    const PgStore = require('connect-pg-simple')(session);
    store = new PgStore({ pool: db.getPool(), tableName: 'session', createTableIfMissing: true });
  }
  if (isProd && !process.env.SESSION_SECRET) throw new Error('Falta SESSION_SECRET');
  app.use(session({
    store,
    secret: process.env.SESSION_SECRET || 'dev-secret-solo-local',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 1000 * 60 * 60 * 8 },
  }));

  app.use(flash);
  app.use(csrf);

  app.use(require('./routes/auth'));
  app.use(require('./routes/dashboard'));
  app.use('/clientes', require('./routes/clientes'));
  app.use('/mascotas', require('./routes/mascotas'));
  app.use('/servicios', require('./routes/servicios'));
  app.use('/personal', require('./routes/personal'));
  app.use('/citas', require('./routes/citas'));
  app.use('/tratamientos', require('./routes/tratamientos'));
  app.use('/mis-citas', require('./routes/misCitas'));

  app.use((req, res) => {
    res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La página que buscas no existe.' });
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (process.env.NODE_ENV !== 'test') console.error(err);
    res.status(500).render('error', { titulo: 'Error del servidor', mensaje: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
  });
  return app;
}

module.exports = { createApp };
