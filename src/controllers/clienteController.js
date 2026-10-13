const Cliente = require('../models/cliente');
const v = require('../utils/validate');

const validar = (b) => v.collect(
  v.required(b.nombre, 'El nombre'), v.maxLen(b.nombre, 100, 'El nombre'),
  v.phone(b.telefono),
  v.required(b.correo, 'El correo') || v.email(b.correo), v.maxLen(b.correo, 120, 'El correo'),
);
const limpiar = (b) => ({ nombre: v.str(b.nombre), telefono: v.str(b.telefono), correo: v.str(b.correo) });

exports.index = async (req, res) => {
  const q = v.str(req.query.q);
  res.render('clientes/index', { titulo: 'Clientes', clientes: await Cliente.list(q), q });
};

exports.nuevo = (req, res) => {
  res.render('clientes/form', { titulo: 'Nuevo cliente', cliente: {}, action: '/clientes', errores: [] });
};

exports.crear = async (req, res) => {
  const errores = validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) {
    return res.status(400).render('clientes/form', { titulo: 'Nuevo cliente', cliente: data, action: '/clientes', errores });
  }
  await Cliente.create(data);
  req.flash('success', 'Cliente registrado correctamente.');
  res.redirect('/clientes');
};

exports.editar = async (req, res) => {
  const cliente = await Cliente.find(req.params.id);
  if (!cliente) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El cliente no existe.' });
  res.render('clientes/form', { titulo: 'Editar cliente', cliente, action: `/clientes/${cliente.id_cliente}`, errores: [] });
};

exports.actualizar = async (req, res) => {
  const existente = await Cliente.find(req.params.id);
  if (!existente) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El cliente no existe.' });
  const errores = validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) {
    return res.status(400).render('clientes/form', {
      titulo: 'Editar cliente', cliente: { ...data, id_cliente: existente.id_cliente },
      action: `/clientes/${existente.id_cliente}`, errores,
    });
  }
  await Cliente.update(existente.id_cliente, data);
  req.flash('success', 'Cliente actualizado correctamente.');
  res.redirect('/clientes');
};

exports.eliminar = async (req, res) => {
  const existente = await Cliente.find(req.params.id);
  if (!existente) {
    req.flash('error', 'El cliente no existe.');
    return res.redirect('/clientes');
  }
  const n = await Cliente.countMascotas(existente.id_cliente);
  if (n > 0) {
    req.flash('error', `No se puede eliminar a ${existente.nombre}: tiene ${n} mascota(s) registrada(s). Elimina o reasigna las mascotas primero.`);
    return res.redirect('/clientes');
  }
  await Cliente.remove(existente.id_cliente);
  req.flash('success', 'Cliente eliminado correctamente.');
  res.redirect('/clientes');
};
