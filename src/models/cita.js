const db = require('../config/db');

exports.ESTADOS = ['Programada', 'Completada', 'Cancelada'];

const BASE = `
  SELECT c.id_cita, c.fecha, c.hora, c.estado, c.id_mascota, c.id_servicio, c.id_personal,
         m.nombre AS mascota, m.especie, cl.nombre AS cliente, cl.telefono AS telefono_cliente,
         s.nombre AS servicio, s.plan, p.nombre AS personal,
         (SELECT COUNT(*)::int FROM tratamiento t WHERE t.id_cita = c.id_cita) AS tratamientos
    FROM cita c
    JOIN mascota m  ON m.id_mascota  = c.id_mascota
    JOIN cliente cl ON cl.id_cliente = m.id_cliente
    JOIN servicio s ON s.id_servicio = c.id_servicio
    JOIN personal p ON p.id_personal = c.id_personal`;

// Filtros opcionales: fecha, estado, personal (id)
exports.list = async ({ fecha, estado, personal } = {}) => {
  const where = [];
  const params = [];
  if (fecha) { params.push(fecha); where.push(`c.fecha = $${params.length}`); }
  if (estado) { params.push(estado); where.push(`c.estado = $${params.length}`); }
  if (personal) { params.push(parseInt(personal, 10)); where.push(`c.id_personal = $${params.length}`); }
  const { rows } = await db.query(
    `${BASE} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.fecha DESC, c.hora DESC`, params);
  return rows;
};

// Citas asignadas a un miembro del personal (rol PERSONAL)
exports.listByPersonal = async (id_personal, { estado } = {}) => {
  const params = [id_personal];
  let extra = '';
  if (estado) { params.push(estado); extra = ' AND c.estado = $2'; }
  const { rows } = await db.query(`${BASE} WHERE c.id_personal = $1${extra} ORDER BY c.fecha, c.hora`, params);
  return rows;
};

exports.listByFecha = async (fecha, id_personal = null) => {
  const params = [fecha];
  let extra = '';
  if (id_personal) { params.push(id_personal); extra = ' AND c.id_personal = $2'; }
  const { rows } = await db.query(`${BASE} WHERE c.fecha = $1${extra} ORDER BY c.hora`, params);
  return rows;
};

exports.find = async (id) => (await db.query(`${BASE} WHERE c.id_cita = $1`, [id])).rows[0];

exports.create = async (d) =>
  (await db.query(
    `INSERT INTO cita (fecha, hora, estado, id_mascota, id_servicio, id_personal)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [d.fecha, d.hora, d.estado, d.id_mascota, d.id_servicio, d.id_personal])).rows[0];

exports.update = async (id, d) =>
  (await db.query(
    `UPDATE cita SET fecha=$1, hora=$2, estado=$3, id_mascota=$4, id_servicio=$5, id_personal=$6
      WHERE id_cita=$7 RETURNING *`,
    [d.fecha, d.hora, d.estado, d.id_mascota, d.id_servicio, d.id_personal, id])).rows[0];

exports.setEstado = (id, estado) => db.query('UPDATE cita SET estado=$1 WHERE id_cita=$2', [estado, id]);

// ¿El personal ya tiene una cita activa en esa fecha y hora?
exports.hayConflicto = async ({ id_personal, fecha, hora, excluirId = 0 }) =>
  (await db.query(
    `SELECT 1 FROM cita
      WHERE id_personal=$1 AND fecha=$2 AND hora=$3::time AND estado <> 'Cancelada' AND id_cita <> $4`,
    [id_personal, fecha, hora, excluirId])).rowCount > 0;

exports.countTratamientos = async (id) =>
  (await db.query('SELECT COUNT(*)::int AS n FROM tratamiento WHERE id_cita=$1', [id])).rows[0].n;

exports.remove = (id) => db.query('DELETE FROM cita WHERE id_cita = $1', [id]);

exports.totales = async (id_personal = null) => {
  const params = id_personal ? [id_personal] : [];
  const w = id_personal ? 'WHERE id_personal = $1' : '';
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE estado='Programada')::int AS programadas,
            COUNT(*) FILTER (WHERE estado='Completada')::int AS completadas,
            COUNT(*) FILTER (WHERE estado='Cancelada')::int AS canceladas
       FROM cita ${w}`, params);
  return rows[0];
};
