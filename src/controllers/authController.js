const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario');
const v = require('../utils/validate');

// Hash falso para igualar tiempos de respuesta cuando el usuario no existe
const DUMMY_HASH = bcrypt.hashSync('no-existe', 10);

exports.showLogin = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { titulo: 'Iniciar sesión' });
};

exports.login = async (req, res, next) => {
  try {
    const correo = v.str(req.body.correo);
    const password = String(req.body.password || '');
    const errores = v.collect(v.required(correo, 'El correo'), v.required(password, 'La contraseña'));
    if (errores.length) {
      req.flash('error', errores);
      return res.redirect('/login');
    }
    const u = await Usuario.findByCorreo(correo);
    const ok = await bcrypt.compare(password, u ? u.password_hash : DUMMY_HASH);
    if (!u || !ok) {
      req.flash('error', 'Correo o contraseña incorrectos.');
      return res.redirect('/login');
    }
    const returnTo = req.session.returnTo;
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = {
        id: u.id_usuario, correo: u.correo, rol: u.rol,
        id_personal: u.id_personal, nombre: u.nombre_personal || 'Administrador',
      };
      req.flash('success', `Bienvenido(a), ${req.session.user.nombre}.`);
      const dest = returnTo && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';
      req.session.save(() => res.redirect(dest));
    });
  } catch (e) { next(e); }
};

exports.logout = (req, res, next) => {
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.flash('success', 'Sesión cerrada correctamente.');
    req.session.save(() => res.redirect('/login'));
  });
};
