const crypto = require('crypto');

// Mensajes flash guardados en sesión
const flash = (req, res, next) => {
  req.flash = (type, msg) => { req.session.flash = { type, msg }; };
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.user = req.session.user || null;
  res.locals.path = req.path;
  next();
};

// Protección CSRF con token por sesión
const csrf = (req, res, next) => {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(24).toString('hex');
  res.locals.csrf = req.session.csrf;
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
    if (!sent || sent !== req.session.csrf) {
      return res.status(403).render('error', {
        titulo: 'Solicitud no válida',
        mensaje: 'El formulario expiró o es inválido. Recarga la página e inténtalo de nuevo.',
      });
    }
  }
  next();
};

module.exports = { flash, csrf };
