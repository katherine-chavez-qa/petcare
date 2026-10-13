const db = require('../config/db');
const Cita = require('../models/cita');
const v = require('../utils/validate');

const count = async (tabla) => (await db.query(`SELECT COUNT(*)::int AS n FROM ${tabla}`)).rows[0].n;

exports.index = async (req, res, next) => {
  try {
    const hoy = v.todayCO();
    const u = req.session.user;
    if (u.rol === 'ADMIN') {
      const [clientes, mascotas, servicios, personal, tratamientos, citas, citasHoy] = await Promise.all([
        count('cliente'), count('mascota'), count('servicio'), count('personal'), count('tratamiento'),
        Cita.totales(), Cita.listByFecha(hoy),
      ]);
      return res.render('dashboard/index', {
        titulo: 'Inicio', hoy, citasHoy, citas,
        totales: { clientes, mascotas, servicios, personal, tratamientos },
      });
    }
    const [citas, citasHoy] = await Promise.all([
      Cita.totales(u.id_personal), Cita.listByFecha(hoy, u.id_personal),
    ]);
    res.render('dashboard/index', { titulo: 'Inicio', hoy, citasHoy, citas, totales: null });
  } catch (e) { next(e); }
};
