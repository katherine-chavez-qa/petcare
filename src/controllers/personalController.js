const bcrypt = require('bcryptjs');
const Personal = require('../models/personal');
const Usuario = require('../models/usuario');
const v = require('../utils/validate');

// El acceso al sistema (usuario) es opcional: si se llena correo o contraseña, se exigen ambos.
const validar = async (b, existente) => {
  const errores = v.collect(
    v.required(b.nombre, 'El nombre'), v.maxLen(b.nombre, 100, 'El nombre'),
    v.required(b.cargo, 'El cargo'), v.maxLen(b.cargo, 80, 'El cargo'),
    v.phone(b.telefono),
  );
  const correo = v.str(b.correo_acceso);
  const pass = String(b.password || '');
  if ((correo || pass) && !(existente && existente.correo_acceso)) {
    const e = v.collect(
      v.required(correo, 'El correo de acceso') || v.email(correo, 'El correo de acceso'),
      pass.length >= 8 ? null : 'La contraseña debe tener al menos 8 caracteres.',
    );
    errores.push(...e);
    if (!e.length && (await Usuario.findByCorreo(correo))) errores.push('Ya existe un usuario con ese correo de acceso.');
  }
  return errores;
};
const limpiar = (b) => ({
  nombre: v.str(b.nombre), cargo: v.str(b.cargo), telefono: v.str(b.telefono),
  correo_acceso: v.str(b.correo_acceso),
});

const form = (res, status, titulo, persona, action, errores = []) =>
  res.status(status).render('personal/form', { titulo, persona, action, errores });

const crearAcceso = async (id_personal, b) => {
  if (v.str(b.correo_acceso) && b.password) {
    await Usuario.create({
      correo: v.str(b.correo_acceso), password_hash: await bcrypt.hash(String(b.password), 10),
      rol: 'PERSONAL', id_personal,
    });
  }
};

exports.index = async (req, res) => {
  const q = v.str(req.query.q);
  res.render('personal/index', { titulo: 'Personal de servicios', personal: await Personal.list(q), q });
};

exports.nuevo = (req, res) => form(res, 200, 'Nuevo miembro del personal', {}, '/personal');

exports.crear = async (req, res) => {
  const errores = await validar(req.body);
  const data = limpiar(req.body);
  if (errores.length) return form(res, 400, 'Nuevo miembro del personal', data, '/personal', errores);
  const p = await Personal.create(data);
  await crearAcceso(p.id_personal, req.body);
  req.flash('success', 'Personal registrado correctamente.');
  res.redirect('/personal');
};

exports.editar = async (req, res) => {
  const p = await Personal.find(req.params.id);
  if (!p) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El registro de personal no existe.' });
  form(res, 200, 'Editar personal', p, `/personal/${p.id_personal}`);
};

exports.actualizar = async (req, res) => {
  const p = await Personal.find(req.params.id);
  if (!p) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El registro de personal no existe.' });
  const errores = await validar(req.body, p);
  const data = limpiar(req.body);
  if (errores.length) {
    return form(res, 400, 'Editar personal', { ...data, id_personal: p.id_personal, correo_acceso: p.correo_acceso || data.correo_acceso }, `/personal/${p.id_personal}`, errores);
  }
  await Personal.update(p.id_personal, data);
  if (!p.correo_acceso) await crearAcceso(p.id_personal, req.body);
  req.flash('success', 'Personal actualizado correctamente.');
  res.redirect('/personal');
};

exports.eliminar = async (req, res) => {
  const p = await Personal.find(req.params.id);
  if (!p) { req.flash('error', 'El registro de personal no existe.'); return res.redirect('/personal'); }
  const n = await Personal.countCitas(p.id_personal);
  if (n > 0) {
    req.flash('error', `No se puede eliminar a ${p.nombre}: tiene ${n} cita(s) asignada(s). Reasigna o elimina esas citas primero.`);
    return res.redirect('/personal');
  }
  await Usuario.deleteByPersonal(p.id_personal);
  await Personal.remove(p.id_personal);
  req.flash('success', 'Personal eliminado correctamente.');
  res.redirect('/personal');
};
