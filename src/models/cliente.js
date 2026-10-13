const db = require('../config/db');

exports.list = async (q = '') => {
  const like = `%${q.toLowerCase()}%`;
  const { rows } = await db.query(
    `SELECT c.*, (SELECT COUNT(*)::int FROM mascota m WHERE m.id_cliente = c.id_cliente) AS mascotas
       FROM cliente c
      WHERE LOWER(c.nombre) LIKE $1 OR LOWER(c.correo) LIKE $1 OR c.telefono LIKE $1
      ORDER BY c.nombre`, [like]);
  return rows;
};

exports.all = async () => (await db.query('SELECT * FROM cliente ORDER BY nombre')).rows;

exports.find = async (id) => (await db.query('SELECT * FROM cliente WHERE id_cliente = $1', [id])).rows[0];

exports.create = async ({ nombre, telefono, correo }) =>
  (await db.query('INSERT INTO cliente (nombre, telefono, correo) VALUES ($1,$2,$3) RETURNING *', [nombre, telefono, correo])).rows[0];

exports.update = async (id, { nombre, telefono, correo }) =>
  (await db.query('UPDATE cliente SET nombre=$1, telefono=$2, correo=$3 WHERE id_cliente=$4 RETURNING *', [nombre, telefono, correo, id])).rows[0];

exports.countMascotas = async (id) =>
  (await db.query('SELECT COUNT(*)::int AS n FROM mascota WHERE id_cliente = $1', [id])).rows[0].n;

exports.remove = (id) => db.query('DELETE FROM cliente WHERE id_cliente = $1', [id]);
