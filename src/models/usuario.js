const db = require('../config/db');

exports.findByCorreo = async (correo) => {
  const { rows } = await db.query(
    `SELECT u.id_usuario, u.correo, u.password_hash, u.rol, u.id_personal, p.nombre AS nombre_personal
       FROM usuario u LEFT JOIN personal p ON p.id_personal = u.id_personal
      WHERE LOWER(u.correo) = LOWER($1)`, [correo]);
  return rows[0];
};

exports.create = async ({ correo, password_hash, rol, id_personal }) => {
  const { rows } = await db.query(
    `INSERT INTO usuario (correo, password_hash, rol, id_personal) VALUES ($1,$2,$3,$4) RETURNING *`,
    [correo, password_hash, rol, id_personal || null]);
  return rows[0];
};

exports.findByPersonal = async (id_personal) => {
  const { rows } = await db.query('SELECT id_usuario, correo FROM usuario WHERE id_personal = $1', [id_personal]);
  return rows[0];
};

exports.deleteByPersonal = (id_personal) => db.query('DELETE FROM usuario WHERE id_personal = $1', [id_personal]);
