const Servicio = require('../models/servicio');
const v = require('../utils/validate');

const validar = (b) => v.collect(
  v.required(b.nombre, 'El nombre'), v.maxLen(b.nombre, 100, 'El nombre'),
  v.maxLen(b.descripcion, 1000, 'La descripción'),
  v.oneOf(b.plan, Servicio.PLANES, 'El plan'),
  v.priceGt0(b.precio),
);
const limpiar = (b) => ({
  nombre: v.str(b.nombre), descripcion: v.str(b.descripcion) || null,
  plan: v.str(b.plan), precio: v.str(b.precio).replace(',', '.'),
});

const form = (res, status, titulo, servicio, action, errores = []) =>
  res.status(status).render('servicios/form', { titulo, servicio, action, errores, planes: Servicio.PLANES });

exports.index = async (req, res) => {
  const q = v.str(req.query.q);
  const plan = Servicio.PLANES.includes(req.query.plan) ? req.query.plan : '';
  res.render('servicios/index', { titulo: 'Servicios y planes', servicios: await Servicio.list({ q, plan }), q, plan, planes: Servicio.PLANES });
};

exports.nuevo = (req, res) => form(res, 200, 'Nuevo servicio', {}, '/servicios');

exports.crear = async (req, res) => {
  const errores = validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) return form(res, 400, 'Nuevo servicio', data, '/servicios', errores);
  await Servicio.create(data);
  req.flash('success', 'Servicio registrado correctamente.');
  res.redirect('/servicios');
};

exports.editar = async (req, res) => {
  const s = await Servicio.find(req.params.id);
  if (!s) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El servicio no existe.' });
  form(res, 200, 'Editar servicio', s, `/servicios/${s.id_servicio}`);
};

exports.actualizar = async (req, res) => {
  const s = await Servicio.find(req.params.id);
  if (!s) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El servicio no existe.' });
  const errores = validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) return form(res, 400, 'Editar servicio', { ...data, id_servicio: s.id_servicio }, `/servicios/${s.id_servicio}`, errores);
  await Servicio.update(s.id_servicio, data);
  req.flash('success', 'Servicio actualizado correctamente.');
  res.redirect('/servicios');
};

exports.eliminar = async (req, res) => {
  const s = await Servicio.find(req.params.id);
  if (!s) { req.flash('error', 'El servicio no existe.'); return res.redirect('/servicios'); }
  const rel = await Servicio.countRelacionados(s.id_servicio);
  if (rel.citas > 0 || rel.tratamientos > 0) {
    req.flash('error', `No se puede eliminar el servicio "${s.nombre}": tiene ${rel.citas} cita(s) y ${rel.tratamientos} tratamiento(s) asociados.`);
    return res.redirect('/servicios');
  }
  await Servicio.remove(s.id_servicio);
  req.flash('success', 'Servicio eliminado correctamente.');
  res.redirect('/servicios');
};
