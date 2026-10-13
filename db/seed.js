// Datos semilla de PetCare: 1 admin, 3 personal (con usuario), 5 clientes, 8 mascotas,
// 6 servicios (planes Básico/Estándar/Premium), 10 citas y 4 tratamientos.
// Uso: npm run db:seed            (falla si ya hay datos)
//      npm run db:seed -- --reset (borra todo y vuelve a sembrar)
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { todayCO } = require('../src/utils/validate');

const ADMIN_EMAIL = 'admin@petcare.test';
const ADMIN_PASS = process.env.SEED_ADMIN_PASSWORD || 'Admin#2026';
const PERSONAL_PASS = process.env.SEED_PERSONAL_PASSWORD || 'Personal#2026';

const addDays = (base, n) => new Date(new Date(base + 'T12:00:00Z').getTime() + n * 86400000).toISOString().slice(0, 10);

async function seed({ reset = false } = {}) {
  await db.init();
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM usuario');
  if (rows[0].n > 0 && !reset) {
    throw new Error('La base de datos ya tiene datos. Usa "npm run db:seed -- --reset" para reiniciarla.');
  }
  await db.reset();
  const hoy = todayCO();
  const ins = async (sql, params) => (await db.query(sql, params)).rows[0];

  // --- Personal y usuarios ---
  const personal = [
    ['Carolina Ramírez Soto', 'Groomer', '3104567821', 'carolina.ramirez@petcare.test'],
    ['Andrés Felipe Muñoz', 'Médico veterinario', '3157890234', 'andres.munoz@petcare.test'],
    ['Daniela Ortiz Peña', 'Auxiliar veterinaria', '3201234987', 'daniela.ortiz@petcare.test'],
  ];
  const P = [];
  const personalHash = bcrypt.hashSync(PERSONAL_PASS, 10);
  for (const [nombre, cargo, tel, correo] of personal) {
    const p = await ins('INSERT INTO personal (nombre,cargo,telefono) VALUES ($1,$2,$3) RETURNING id_personal', [nombre, cargo, tel]);
    await db.query(`INSERT INTO usuario (correo,password_hash,rol,id_personal) VALUES ($1,$2,'PERSONAL',$3)`, [correo, personalHash, p.id_personal]);
    P.push(p.id_personal);
  }
  await db.query(`INSERT INTO usuario (correo,password_hash,rol) VALUES ($1,$2,'ADMIN')`, [ADMIN_EMAIL, bcrypt.hashSync(ADMIN_PASS, 10)]);

  // --- Clientes ---
  const clientes = [
    ['Juliana Restrepo Gómez', '3115550142', 'juliana.restrepo@correo.co'],
    ['Carlos Andrés Pardo', '3128841357', 'carlos.pardo@correo.co'],
    ['Luz Marina Herrera', '3006672891', 'luzmarina.herrera@correo.co'],
    ['Sebastián Cárdenas Ruiz', '3173309465', 'sebastian.cardenas@correo.co'],
    ['Paola Andrea Vargas', '3189027743', 'paola.vargas@correo.co'],
  ];
  const C = [];
  for (const [n, t, c] of clientes) {
    C.push((await ins('INSERT INTO cliente (nombre,telefono,correo) VALUES ($1,$2,$3) RETURNING id_cliente', [n, t, c])).id_cliente);
  }

  // --- Mascotas ---
  const mascotas = [
    ['Max', 'Perro', 'Labrador', 4, 0], ['Luna', 'Gato', 'Siamés', 2, 1], ['Toby', 'Perro', 'Criollo', 6, 2],
    ['Mía', 'Perro', 'Poodle', 3, 0], ['Simón', 'Gato', 'Criollo', 5, 3], ['Rocky', 'Perro', 'Bulldog francés', 2, 4],
    ['Canela', 'Perro', 'Golden Retriever', 7, 2], ['Pelusa', 'Conejo', 'Mini lop', 1, 3],
  ];
  const M = [];
  for (const [n, e, r, ed, ic] of mascotas) {
    M.push((await ins('INSERT INTO mascota (nombre,especie,raza,edad,id_cliente) VALUES ($1,$2,$3,$4,$5) RETURNING id_mascota', [n, e, r, ed, C[ic]])).id_mascota);
  }

  // --- Servicios agrupados por plan ---
  const servicios = [
    ['Baño higiénico', 'Baño con shampoo hipoalergénico, secado y cepillado.', 'Básico', 35000],
    ['Corte de uñas y limpieza de oídos', 'Corte de uñas y limpieza externa de oídos.', 'Básico', 25000],
    ['Baño y peluquería', 'Baño completo, corte de pelo según raza y perfume.', 'Estándar', 55000],
    ['Consulta veterinaria a domicilio', 'Revisión general de salud y recomendaciones del veterinario.', 'Estándar', 80000],
    ['Paquete spa completo', 'Baño, peluquería, corte de uñas, limpieza dental y masaje relajante.', 'Premium', 120000],
    ['Vacunación y desparasitación', 'Aplicación de esquema de vacunas y desparasitación interna/externa.', 'Premium', 95000],
  ];
  const S = [];
  for (const [n, d, p, pr] of servicios) {
    S.push((await ins('INSERT INTO servicio (nombre,descripcion,plan,precio) VALUES ($1,$2,$3,$4) RETURNING id_servicio', [n, d, p, pr])).id_servicio);
  }

  // --- Citas (mascota, servicio, personal, días desde hoy, hora, estado) ---
  const citas = [
    [0, 2, 0, -10, '09:00', 'Completada'], [1, 3, 1, -7, '10:00', 'Completada'],
    [2, 5, 1, -4, '15:00', 'Completada'], [3, 0, 0, -2, '11:00', 'Completada'],
    [5, 4, 0, 0, '14:00', 'Programada'], [6, 2, 2, 0, '16:00', 'Programada'],
    [4, 3, 1, 1, '09:30', 'Programada'], [7, 1, 2, 2, '10:00', 'Programada'],
    [0, 4, 0, 3, '08:00', 'Programada'], [1, 0, 2, -1, '13:00', 'Cancelada'],
  ];
  const CI = [];
  for (const [m, s, p, d, h, e] of citas) {
    CI.push((await ins(
      'INSERT INTO cita (fecha,hora,estado,id_mascota,id_servicio,id_personal) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_cita',
      [addDays(hoy, d), h, e, M[m], S[s], P[p]])).id_cita);
  }

  // --- Tratamientos de las 4 citas completadas ---
  const trat = [
    [0, 'Baño completo y corte de pelo tipo cachorro.', -10, 'Tolera bien el secador. Se recomienda repetir en 6 semanas.'],
    [1, 'Revisión general: peso, temperatura y auscultación normales.', -7, 'Se sugiere cambio de alimento por uno hipoalergénico.'],
    [2, 'Aplicación de vacuna múltiple y desparasitación interna.', -4, 'Próximo refuerzo en 21 días.'],
    [3, 'Baño higiénico con shampoo hipoalergénico.', -2, 'Ligera irritación en la piel del abdomen; se aplicó crema.'],
  ];
  for (const [i, desc, d, obs] of trat) {
    const c = citas[i];
    await db.query(
      'INSERT INTO tratamiento (descripcion,fecha,observaciones,id_mascota,id_cita,id_servicio) VALUES ($1,$2,$3,$4,$5,$6)',
      [desc, addDays(hoy, d), obs, M[c[0]], CI[i], S[c[1]]]);
  }

  return { admin: ADMIN_EMAIL, personal: personal.map((p) => p[3]) };
}

module.exports = { seed, ADMIN_EMAIL, ADMIN_PASS, PERSONAL_PASS };

if (require.main === module) {
  seed({ reset: process.argv.includes('--reset') })
    .then((r) => { console.log('Datos semilla cargados.', r); return db.close(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
