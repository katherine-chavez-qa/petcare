const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) return next();
  if (req.method === 'GET') req.session.returnTo = req.originalUrl;
  req.flash('error', 'Debes iniciar sesión para continuar.');
  return res.redirect('/login');
};

const requireRole = (...roles) => (req, res, next) => {
  if (req.session.user && roles.includes(req.session.user.rol)) return next();
  return res.status(403).render('error', {
    titulo: 'Acceso denegado',
    mensaje: 'No tienes permisos para acceder a esta sección.',
  });
};

module.exports = { requireAuth, requireRole };
