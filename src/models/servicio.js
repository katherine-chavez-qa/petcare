const db = require('../config/db');

exports.PLANES = ['Básico', 'Estándar', 'Premium'];

exports.list = async ({ q = '', plan = '' } = {}) => {
  const params = [`%${q.toLowerCase()}%`];
  let filtro = '';
  if (plan) { params.push(plan); filtro = ' AND plan = $2'; }
  const { rows } = await db.query(
    `SELECT * FROM servicio
      WHERE (LOWER(nombre) LIKE $1 OR LOWER(COALESCE(descripcion,'')) LIKE $1)${filtro}
      ORDER BY CASE plan WHEN 'Básico' THEN 1 WHEN 'Estándar' THEN 2 ELSE 3 END, nombre`, params);
  return rows;
};

exports.all = async () =>
  (await db.query(`SELECT * FROM servicio ORDER BY CASE plan WHEN 'Básico' THEN 1 WHEN 'Estándar' THEN 2 ELSE 3 END, nombre`)).rows;

exports.find = async (id) => (await db.query('SELECT * FROM servicio WHERE id_servicio = $1', [id])).rows[0];

exports.create = async (d) =>
  (await db.query(
    'INSERT INTO servicio (nombre, descripcion, plan, precio) VALUES ($1,$2,$3,$4) RETURNING *',
    [d.nombre, d.descripcion, d.plan, d.precio])).rows[0];

exports.update = async (id, d) =>
  (await db.query(
    'UPDATE servicio SET nombre=$1, descripcion=$2, plan=$3, precio=$4 WHERE id_servicio=$5 RETURNING *',
    [d.nombre, d.descripcion, d.plan, d.precio, id])).rows[0];

exports.countRelacionados = async (id) =>
  (await db.query(
    `SELECT (SELECT COUNT(*)::int FROM cita WHERE id_servicio=$1) AS citas,
            (SELECT COUNT(*)::int FROM tratamiento WHERE id_servicio=$1) AS tratamientos`, [id])).rows[0];

exports.remove = (id) => db.query('DELETE FROM servicio WHERE id_servicio = $1', [id]);
