const Tratamiento = require('../models/tratamiento');
const Cita = require('../models/cita');
const v = require('../utils/validate');

const validar = (b) => v.collect(
  v.required(b.descripcion, 'La descripción'), v.maxLen(b.descripcion, 2000, 'La descripción'),
  v.maxLen(b.observaciones, 2000, 'Las observaciones'),
  v.dateValid(b.fecha, 'La fecha del tratamiento'),
);
const limpiar = (b) => ({
  descripcion: v.str(b.descripcion), fecha: v.str(b.fecha), observaciones: v.str(b.observaciones) || null,
});

const MSG_ESTADO = 'Solo se pueden registrar tratamientos en citas programadas.';

// Lógica compartida (ADMIN y PERSONAL): valida y registra, marcando la cita como Completada.
// Devuelve { errores } o { tratamiento }.
exports.registrar = async (cita, body) => {
  if (cita.estado !== 'Programada') return { errores: [MSG_ESTADO] };
  const errores = validar(body);
  if (errores.length) return { errores };
  const t = await Tratamiento.registrarDesdeCita(cita.id_cita, limpiar(body));
  if (!t) return { errores: [MSG_ESTADO] };
  return { tratamiento: t };
};

const nf = (res) => res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El tratamiento no existe.' });

exports.index = async (req, res) => {
  const q = v.str(req.query.q);
  res.render('tratamientos/index', { titulo: 'Tratamientos', tratamientos: await Tratamiento.list(q), q });
};

const formNuevo = async (res, status, t, errores = []) => {
  const citas = (await Cita.list({ estado: 'Programada' })).reverse();
  res.status(status).render('tratamientos/form', {
    titulo: 'Registrar tratamiento', t, errores, citas, action: '/tratamientos', edicion: false,
  });
};

exports.nuevo = (req, res) =>
  formNuevo(res, 200, { id_cita: v.str(req.query.cita), fecha: v.todayCO() });

exports.crear = async (req, res) => {
  const idCita = v.str(req.body.id_cita);
  const cita = /^\d+$/.test(idCita) ? await Cita.find(idCita) : null;
  const datos = { ...limpiar(req.body), id_cita: idCita };
  if (!cita) return formNuevo(res, 400, datos, ['Debes seleccionar una cita válida.']);
  const r = await exports.registrar(cita, req.body);
  if (r.errores) return formNuevo(res, 400, datos, r.errores);
  req.flash('success', 'Tratamiento registrado y cita marcada como Completada.');
  res.redirect('/tratamientos');
};

exports.editar = async (req, res) => {
  const t = await Tratamiento.find(req.params.id);
  if (!t) return nf(res);
  res.render('tratamientos/form', {
    titulo: 'Editar tratamiento', t, errores: [], citas: [], action: `/tratamientos/${t.id_tratamiento}`, edicion: true,
  });
};

exports.actualizar = async (req, res) => {
  const t = await Tratamiento.find(req.params.id);
  if (!t) return nf(res);
  const errores = validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) {
    return res.status(400).render('tratamientos/form', {
      titulo: 'Editar tratamiento', t: { ...t, ...data }, errores, citas: [],
      action: `/tratamientos/${t.id_tratamiento}`, edicion: true,
    });
  }
  await Tratamiento.update(t.id_tratamiento, data);
  req.flash('success', 'Tratamiento actualizado correctamente.');
  res.redirect('/tratamientos');
};

exports.eliminar = async (req, res) => {
  const t = await Tratamiento.find(req.params.id);
  if (!t) { req.flash('error', 'El tratamiento no existe.'); return res.redirect('/tratamientos'); }
  await Tratamiento.remove(t);
  req.flash('success', 'Tratamiento eliminado correctamente.');
  res.redirect('/tratamientos');
};
