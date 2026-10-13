const db = require('../config/db');

const BASE = `
  SELECT t.*, m.nombre AS mascota, s.nombre AS servicio, c.fecha AS fecha_cita, c.hora AS hora_cita,
         c.id_personal, p.nombre AS personal
    FROM tratamiento t
    JOIN mascota m  ON m.id_mascota  = t.id_mascota
    JOIN servicio s ON s.id_servicio = t.id_servicio
    JOIN cita c     ON c.id_cita     = t.id_cita
    JOIN personal p ON p.id_personal = c.id_personal`;

exports.list = async (q = '') => {
  const { rows } = await db.query(
    `${BASE} WHERE LOWER(t.descripcion) LIKE $1 OR LOWER(m.nombre) LIKE $1 OR LOWER(s.nombre) LIKE $1
      ORDER BY t.fecha DESC, t.id_tratamiento DESC`, [`%${q.toLowerCase()}%`]);
  return rows;
};

exports.listByCita = async (id_cita) =>
  (await db.query(`${BASE} WHERE t.id_cita = $1 ORDER BY t.id_tratamiento`, [id_cita])).rows;

exports.find = async (id) => (await db.query(`${BASE} WHERE t.id_tratamiento = $1`, [id])).rows[0];

// Registra el tratamiento y marca la cita como Completada en una sola sentencia atómica.
// Devuelve la fila creada, o undefined si la cita no estaba Programada.
exports.registrarDesdeCita = async (id_cita, { descripcion, fecha, observaciones }) =>
  (await db.query(
    `WITH upd AS (
       UPDATE cita SET estado = 'Completada'
        WHERE id_cita = $1 AND estado = 'Programada'
        RETURNING id_cita, id_mascota, id_servicio)
     INSERT INTO tratamiento (descripcion, fecha, observaciones, id_mascota, id_cita, id_servicio)
     SELECT $2, $3, $4, id_mascota, id_cita, id_servicio FROM upd
     RETURNING *`,
    [id_cita, descripcion, fecha, observaciones])).rows[0];

exports.update = async (id, { descripcion, fecha, observaciones }) =>
  (await db.query(
    'UPDATE tratamiento SET descripcion=$1, fecha=$2, observaciones=$3 WHERE id_tratamiento=$4 RETURNING *',
    [descripcion, fecha, observaciones, id])).rows[0];

// Elimina el tratamiento; si la cita queda sin tratamientos vuelve a Programada.
exports.remove = async (t) => {
  await db.query('DELETE FROM tratamiento WHERE id_tratamiento = $1', [t.id_tratamiento]);
  await db.query(
    `UPDATE cita SET estado = 'Programada'
      WHERE id_cita = $1 AND estado = 'Completada'
        AND NOT EXISTS (SELECT 1 FROM tratamiento WHERE id_cita = $1)`, [t.id_cita]);
};

exports.count = async () => (await db.query('SELECT COUNT(*)::int AS n FROM tratamiento')).rows[0].n;
