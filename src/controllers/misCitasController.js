const Cita = require('../models/cita');
const Tratamiento = require('../models/tratamiento');
const tratamientoCtrl = require('./tratamientoController');
const v = require('../utils/validate');

// Devuelve la cita solo si pertenece al personal en sesión; si no, responde y devuelve null.
const citaPropia = async (req, res) => {
  const c = await Cita.find(req.params.id);
  if (!c) {
    res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La cita no existe.' });
    return null;
  }
  if (c.id_personal !== req.session.user.id_personal) {
    res.status(403).render('error', { titulo: 'Acceso denegado', mensaje: 'Esta cita no está asignada a ti.' });
    return null;
  }
  return c;
};

const detalle = async (res, c, status = 200, errores = [], t = {}) =>
  res.status(status).render('mis-citas/show', {
    titulo: `Cita #${c.id_cita}`, cita: c, tratamientos: await Tratamiento.listByCita(c.id_cita),
    errores, t: { fecha: v.todayCO(), ...t },
  });

exports.index = async (req, res) => {
  const estado = ['Programada', 'Completada', 'Cancelada'].includes(req.query.estado) ? req.query.estado : '';
  const citas = await Cita.listByPersonal(req.session.user.id_personal, { estado });
  res.render('mis-citas/index', { titulo: 'Mis citas', citas, estado });
};

exports.show = async (req, res) => {
  const c = await citaPropia(req, res);
  if (c) await detalle(res, c);
};

exports.registrarTratamiento = async (req, res) => {
  const c = await citaPropia(req, res);
  if (!c) return;
  const r = await tratamientoCtrl.registrar(c, req.body);
  if (r.errores) return detalle(res, c, 400, r.errores, req.body);
  req.flash('success', 'Tratamiento registrado. La cita quedó como Completada.');
  res.redirect(`/mis-citas/${c.id_cita}`);
};
