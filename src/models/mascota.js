const db = require('../config/db');

exports.list = async ({ q = '', cliente = '' } = {}) => {
  const like = `%${q.toLowerCase()}%`;
  const params = [like];
  let filtro = '';
  if (/^\d+$/.test(cliente)) { params.push(parseInt(cliente, 10)); filtro = ' AND m.id_cliente = $2'; }
  const { rows } = await db.query(
    `SELECT m.*, c.nombre AS cliente
       FROM mascota m JOIN cliente c ON c.id_cliente = m.id_cliente
      WHERE (LOWER(m.nombre) LIKE $1 OR LOWER(m.especie) LIKE $1 OR LOWER(COALESCE(m.raza,'')) LIKE $1 OR LOWER(c.nombre) LIKE $1)${filtro}
      ORDER BY m.nombre`, params);
  return rows;
};

// Para listas desplegables
exports.all = async () =>
  (await db.query(`SELECT m.id_mascota, m.nombre, c.nombre AS cliente
                     FROM mascota m JOIN cliente c ON c.id_cliente = m.id_cliente ORDER BY m.nombre`)).rows;

exports.find = async (id) => (await db.query('SELECT * FROM mascota WHERE id_mascota = $1', [id])).rows[0];

exports.create = async (d) =>
  (await db.query(
    `INSERT INTO mascota (nombre, especie, raza, edad, id_cliente) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [d.nombre, d.especie, d.raza, d.edad, d.id_cliente])).rows[0];

exports.update = async (id, d) =>
  (await db.query(
    `UPDATE mascota SET nombre=$1, especie=$2, raza=$3, edad=$4, id_cliente=$5 WHERE id_mascota=$6 RETURNING *`,
    [d.nombre, d.especie, d.raza, d.edad, d.id_cliente, id])).rows[0];

exports.countRelacionados = async (id) =>
  (await db.query(
    `SELECT (SELECT COUNT(*)::int FROM cita WHERE id_mascota=$1) AS citas,
            (SELECT COUNT(*)::int FROM tratamiento WHERE id_mascota=$1) AS tratamientos`, [id])).rows[0];

exports.remove = (id) => db.query('DELETE FROM mascota WHERE id_mascota = $1', [id]);
