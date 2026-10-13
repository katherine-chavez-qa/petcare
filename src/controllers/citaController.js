const Cita = require('../models/cita');
const Mascota = require('../models/mascota');
const Servicio = require('../models/servicio');
const Personal = require('../models/personal');
const v = require('../utils/validate');

const MSG_CHOQUE = 'El personal seleccionado ya tiene una cita programada en esa fecha y hora.';

const limpiar = (b) => ({
  fecha: v.str(b.fecha), hora: v.str(b.hora), estado: 'Programada',
  id_mascota: v.str(b.id_mascota), id_servicio: v.str(b.id_servicio), id_personal: v.str(b.id_personal),
});

// excluirId: cita que se edita. validarFecha: exigir fecha no pasada (alta o cambio de fecha).
const validar = async (d, { excluirId = 0, validarFecha = true } = {}) => {
  const errores = v.collect(
    validarFecha ? v.dateNotPast(d.fecha, 'La fecha de la cita') : v.dateValid(d.fecha, 'La fecha de la cita'),
    v.timeValid(d.hora),
    v.idPositive(d.id_mascota, 'una mascota'),
    v.idPositive(d.id_servicio, 'un servicio'),
    v.idPositive(d.id_personal, 'un miembro del personal'),
  );
  if (errores.length) return errores;
  if (!(await Mascota.find(d.id_mascota))) errores.push('La mascota seleccionada no existe.');
  if (!(await Servicio.find(d.id_servicio))) errores.push('El servicio seleccionado no existe.');
  if (!(await Personal.find(d.id_personal))) errores.push('El personal seleccionado no existe.');
  if (!errores.length && (await Cita.hayConflicto({ ...d, excluirId }))) errores.push(MSG_CHOQUE);
  return errores;
};

const esChoque = (e) => e && (e.code === '23505' || /uq_cita_personal/.test(e.message || ''));

const form = async (res, status, titulo, cita, action, errores = []) =>
  res.status(status).render('citas/form', {
    titulo, cita, action, errores,
    mascotas: await Mascota.all(), servicios: await Servicio.all(), personal: await Personal.all(),
    hoy: v.todayCO(),
  });

const noEncontrada = (res) =>
  res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La cita no existe.' });

exports.index = async (req, res) => {
  const f = {
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(req.query.fecha || '') ? req.query.fecha : '',
    estado: Cita.ESTADOS.includes(req.query.estado) ? req.query.estado : '',
    personal: /^\d+$/.test(req.query.personal || '') ? req.query.personal : '',
  };
  res.render('citas/index', {
    titulo: 'Citas', citas: await Cita.list(f), f, estados: Cita.ESTADOS, personal: await Personal.all(),
  });
};

exports.nuevo = (req, res) => form(res, 200, 'Programar cita', {}, '/citas');

exports.crear = async (req, res) => {
  const data = limpiar(req.body);
  const errores = await validar(data);
  if (errores.length) return form(res, 400, 'Programar cita', data, '/citas', errores);
  try {
    await Cita.create(data);
  } catch (e) {
    if (!esChoque(e)) throw e;
    return form(res, 400, 'Programar cita', data, '/citas', [MSG_CHOQUE]);
  }
  req.flash('success', 'Cita programada correctamente.');
  res.redirect('/citas');
};

exports.editar = async (req, res) => {
  const c = await Cita.find(req.params.id);
  if (!c) return noEncontrada(res);
  if (c.estado !== 'Programada') {
    req.flash('error', `La cita está ${c.estado.toLowerCase()} y ya no se puede modificar.`);
    return res.redirect('/citas');
  }
  form(res, 200, 'Editar cita', c, `/citas/${c.id_cita}`);
};

exports.actualizar = async (req, res) => {
  const c = await Cita.find(req.params.id);
  if (!c) return noEncontrada(res);
  if (c.estado !== 'Programada') {
    req.flash('error', `La cita está ${c.estado.toLowerCase()} y ya no se puede modificar.`);
    return res.redirect('/citas');
  }
  const data = limpiar(req.body);
  const errores = await validar(data, { excluirId: c.id_cita, validarFecha: data.fecha !== c.fecha });
  const accion = `/citas/${c.id_cita}`;
  if (errores.length) return form(res, 400, 'Editar cita', { ...data, id_cita: c.id_cita }, accion, errores);
  try {
    await Cita.update(c.id_cita, data);
  } catch (e) {
    if (!esChoque(e)) throw e;
    return form(res, 400, 'Editar cita', { ...data, id_cita: c.id_cita }, accion, [MSG_CHOQUE]);
  }
  req.flash('success', 'Cita actualizada correctamente.');
  res.redirect('/citas');
};

exports.cancelar = async (req, res) => {
  const c = await Cita.find(req.params.id);
  if (!c) return noEncontrada(res);
  if (c.estado !== 'Programada') {
    req.flash('error', `Solo se pueden cancelar citas programadas (esta está ${c.estado.toLowerCase()}).`);
    return res.redirect('/citas');
  }
  await Cita.setEstado(c.id_cita, 'Cancelada');
  req.flash('success', 'Cita cancelada correctamente.');
  res.redirect('/citas');
};

exports.eliminar = async (req, res) => {
  const c = await Cita.find(req.params.id);
  if (!c) { req.flash('error', 'La cita no existe.'); return res.redirect('/citas'); }
  const n = await Cita.countTratamientos(c.id_cita);
  if (n > 0) {
    req.flash('error', `No se puede eliminar la cita: tiene ${n} tratamiento(s) registrado(s).`);
    return res.redirect('/citas');
  }
  await Cita.remove(c.id_cita);
  req.flash('success', 'Cita eliminada correctamente.');
  res.redirect('/citas');
};
