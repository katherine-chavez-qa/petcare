const db = require('../config/db');

exports.list = async (q = '') => {
  const { rows } = await db.query(
    `SELECT p.*, u.correo AS correo_acceso
       FROM personal p LEFT JOIN usuario u ON u.id_personal = p.id_personal
      WHERE LOWER(p.nombre) LIKE $1 OR LOWER(p.cargo) LIKE $1 OR p.telefono LIKE $1
      ORDER BY p.nombre`, [`%${q.toLowerCase()}%`]);
  return rows;
};

exports.all = async () => (await db.query('SELECT * FROM personal ORDER BY nombre')).rows;

exports.find = async (id) =>
  (await db.query(
    `SELECT p.*, u.correo AS correo_acceso
       FROM personal p LEFT JOIN usuario u ON u.id_personal = p.id_personal WHERE p.id_personal = $1`, [id])).rows[0];

exports.create = async ({ nombre, cargo, telefono }) =>
  (await db.query('INSERT INTO personal (nombre, cargo, telefono) VALUES ($1,$2,$3) RETURNING *', [nombre, cargo, telefono])).rows[0];

exports.update = async (id, { nombre, cargo, telefono }) =>
  (await db.query('UPDATE personal SET nombre=$1, cargo=$2, telefono=$3 WHERE id_personal=$4 RETURNING *', [nombre, cargo, telefono, id])).rows[0];

exports.countCitas = async (id) =>
  (await db.query('SELECT COUNT(*)::int AS n FROM cita WHERE id_personal = $1', [id])).rows[0].n;

exports.remove = (id) => db.query('DELETE FROM personal WHERE id_personal = $1', [id]);
