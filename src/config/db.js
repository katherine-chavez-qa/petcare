const fs = require('fs');
const path = require('path');

const schemaSql = fs.readFileSync(path.join(__dirname, '../../db/schema.sql'), 'utf8');
const isTest = process.env.NODE_ENV === 'test';
const connectionString = isTest ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;

let pool = null;   // pg.Pool (Neon / Postgres)
let lite = null;   // PGlite (solo pruebas, sin instalar Postgres)

if (connectionString) {
  const { Pool, types } = require('pg');
  types.setTypeParser(1082, (v) => v);          // DATE -> 'YYYY-MM-DD'
  types.setTypeParser(1700, (v) => parseFloat(v)); // DECIMAL -> number
  const local = /localhost|127\.0\.0\.1/.test(connectionString);
  pool = new Pool({ connectionString, ssl: local ? false : { rejectUnauthorized: false }, max: 5 });
} else if (isTest) {
  const { PGlite } = require('@electric-sql/pglite');
  lite = new PGlite({ parsers: { 1082: (v) => v, 1700: (v) => parseFloat(v) } });
} else {
  throw new Error('Falta DATABASE_URL. Copia .env.example a .env y complétalo.');
}

async function query(text, params = []) {
  if (pool) {
    const r = await pool.query(text, params);
    return { rows: r.rows, rowCount: r.rowCount };
  }
  const r = await lite.query(text, params);
  return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
}

async function exec(sql) {
  if (pool) return pool.query(sql);
  return lite.exec(sql);
}

const init = () => exec(schemaSql);

async function reset() {
  await exec('TRUNCATE tratamiento, cita, usuario, mascota, servicio, personal, cliente RESTART IDENTITY CASCADE');
}

async function close() {
  if (pool) await pool.end();
  if (lite) await lite.close();
}

module.exports = { query, exec, init, reset, close, getPool: () => pool };
