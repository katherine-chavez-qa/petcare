const request = require('supertest');
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const { createApp } = require('../src/app');

const ADMIN = { correo: 'admin@petcare.test', password: 'Admin123!' };
const PERSONAL1 = { correo: 'ana@petcare.test', password: 'Personal123!' };
const PERSONAL2 = { correo: 'luis@petcare.test', password: 'Personal123!' };

const tokenFrom = async (agent, url) => {
  const r = await agent.get(url);
  const m = /name="_csrf" value="([^"]+)"/.exec(r.text);
  return m && m[1];
};

// Crea el esquema, limpia datos y siembra 1 admin + 2 personas de personal con usuario.
async function setupDb() {
  await db.init();
  await db.reset();
  const hash = (p) => bcrypt.hashSync(p, 4);
  const p1 = (await db.query(`INSERT INTO personal (nombre,cargo,telefono) VALUES ('Ana Ruiz','Groomer','3001112233') RETURNING id_personal`)).rows[0].id_personal;
  const p2 = (await db.query(`INSERT INTO personal (nombre,cargo,telefono) VALUES ('Luis Mora','Veterinario','3004445566') RETURNING id_personal`)).rows[0].id_personal;
  await db.query(`INSERT INTO usuario (correo,password_hash,rol) VALUES ($1,$2,'ADMIN')`, [ADMIN.correo, hash(ADMIN.password)]);
  await db.query(`INSERT INTO usuario (correo,password_hash,rol,id_personal) VALUES ($1,$2,'PERSONAL',$3)`, [PERSONAL1.correo, hash(PERSONAL1.password), p1]);
  await db.query(`INSERT INTO usuario (correo,password_hash,rol,id_personal) VALUES ($1,$2,'PERSONAL',$3)`, [PERSONAL2.correo, hash(PERSONAL2.password), p2]);
  return { p1, p2 };
}

// Agente con sesión iniciada y helper agent.form(url, body) que adjunta el token CSRF.
async function login(app, cred) {
  const agent = request.agent(app);
  const t = await tokenFrom(agent, '/login');
  const r = await agent.post('/login').type('form').send({ _csrf: t, correo: cred.correo, password: cred.password });
  // Si el login fue exitoso la sesión se regenera (nuevo token); si no, se conserva el anterior
  agent.csrf = r.headers.location === '/login' ? t : await tokenFrom(agent, '/');
  agent.form = (url, body = {}) => agent.post(url).type('form').send({ _csrf: agent.csrf, ...body });
  return agent;
}

const build = () => createApp();

// Fecha futura YYYY-MM-DD (días desde hoy)
const futureDate = (days = 7) => {
  const d = new Date(Date.now() + days * 86400000);
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

// Cliente + mascota + servicio de apoyo para pruebas de citas/tratamientos
async function baseData() {
  const c = (await db.query(`INSERT INTO cliente (nombre,telefono,correo) VALUES ('Laura Gómez','3151234567','laura@correo.co') RETURNING id_cliente`)).rows[0].id_cliente;
  const m = (await db.query(`INSERT INTO mascota (nombre,especie,raza,edad,id_cliente) VALUES ('Max','Perro','Labrador',4,$1) RETURNING id_mascota`, [c])).rows[0].id_mascota;
  const s = (await db.query(`INSERT INTO servicio (nombre,descripcion,plan,precio) VALUES ('Baño medicado','Baño','Premium',60000) RETURNING id_servicio`)).rows[0].id_servicio;
  return { c, m, s };
}

const crearCita = async ({ m, s, p, fecha, hora = '10:00', estado = 'Programada' }) =>
  (await db.query(
    `INSERT INTO cita (fecha,hora,estado,id_mascota,id_servicio,id_personal) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id_cita`,
    [fecha, hora, estado, m, s, p])).rows[0].id_cita;

module.exports = { db, setupDb, login, build, request, ADMIN, PERSONAL1, PERSONAL2, futureDate, baseData, crearCita };
