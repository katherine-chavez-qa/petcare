const Mascota = require('../models/mascota');
const Cliente = require('../models/cliente');
const v = require('../utils/validate');

const validar = async (b) => {
  const errores = v.collect(
    v.required(b.nombre, 'El nombre'), v.maxLen(b.nombre, 80, 'El nombre'),
    v.required(b.especie, 'La especie'), v.maxLen(b.especie, 50, 'La especie'),
    v.maxLen(b.raza, 80, 'La raza'),
    v.intMin(b.edad, 0, 'La edad'),
    v.idPositive(b.id_cliente, 'un cliente'),
  );
  if (!errores.length && !(await Cliente.find(b.id_cliente))) errores.push('El cliente seleccionado no existe.');
  return errores;
};
const limpiar = (b) => ({
  nombre: v.str(b.nombre), especie: v.str(b.especie), raza: v.str(b.raza) || null,
  edad: v.str(b.edad), id_cliente: v.str(b.id_cliente),
});

const form = async (res, status, titulo, mascota, action, errores = []) =>
  res.status(status).render('mascotas/form', { titulo, mascota, action, errores, clientes: await Cliente.all() });

exports.index = async (req, res) => {
  const q = v.str(req.query.q);
  const cliente = v.str(req.query.cliente);
  res.render('mascotas/index', {
    titulo: 'Mascotas', mascotas: await Mascota.list({ q, cliente }), q, cliente, clientes: await Cliente.all(),
  });
};

exports.nuevo = (req, res) =>
  form(res, 200, 'Nueva mascota', { id_cliente: v.str(req.query.cliente) }, '/mascotas');

exports.crear = async (req, res) => {
  const errores = await validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) return form(res, 400, 'Nueva mascota', data, '/mascotas', errores);
  await Mascota.create(data);
  req.flash('success', 'Mascota registrada correctamente.');
  res.redirect('/mascotas');
};

exports.editar = async (req, res) => {
  const m = await Mascota.find(req.params.id);
  if (!m) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La mascota no existe.' });
  form(res, 200, 'Editar mascota', m, `/mascotas/${m.id_mascota}`);
};

exports.actualizar = async (req, res) => {
  const m = await Mascota.find(req.params.id);
  if (!m) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La mascota no existe.' });
  const errores = await validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) return form(res, 400, 'Editar mascota', { ...data, id_mascota: m.id_mascota }, `/mascotas/${m.id_mascota}`, errores);
  await Mascota.update(m.id_mascota, data);
  req.flash('success', 'Mascota actualizada correctamente.');
  res.redirect('/mascotas');
};

exports.eliminar = async (req, res) => {
  const m = await Mascota.find(req.params.id);
  if (!m) { req.flash('error', 'La mascota no existe.'); return res.redirect('/mascotas'); }
  const rel = await Mascota.countRelacionados(m.id_mascota);
  if (rel.citas > 0 || rel.tratamientos > 0) {
    req.flash('error', `No se puede eliminar a ${m.nombre}: tiene ${rel.citas} cita(s) y ${rel.tratamientos} tratamiento(s) asociados.`);
    return res.redirect('/mascotas');
  }
  await Mascota.remove(m.id_mascota);
  req.flash('success', 'Mascota eliminada correctamente.');
  res.redirect('/mascotas');
};
