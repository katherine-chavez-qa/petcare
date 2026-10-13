const { db, build, login, request } = require('./helpers');
const { seed, ADMIN_EMAIL, ADMIN_PASS, PERSONAL_PASS } = require('../db/seed');

let app;
beforeAll(async () => { await seed({ reset: true }); app = build(); });
afterAll(() => db.close());

const n = async (t) => (await db.query(`SELECT COUNT(*)::int AS n FROM ${t}`)).rows[0].n;

describe('Datos semilla', () => {
  test('cantidades según lo acordado', async () => {
    expect(await n('cliente')).toBe(5);
    expect(await n('mascota')).toBe(8);
    expect(await n('servicio')).toBe(6);
    expect(await n('personal')).toBe(3);
    expect(await n('cita')).toBe(10);
    expect(await n('tratamiento')).toBe(4);
    expect((await db.query(`SELECT COUNT(*)::int n FROM usuario WHERE rol='ADMIN'`)).rows[0].n).toBe(1);
    expect((await db.query(`SELECT COUNT(*)::int n FROM usuario WHERE rol='PERSONAL'`)).rows[0].n).toBe(3);
  });

  test('estados de cita variados y planes completos', async () => {
    const e = (await db.query('SELECT DISTINCT estado FROM cita')).rows.map((r) => r.estado).sort();
    expect(e).toEqual(['Cancelada', 'Completada', 'Programada']);
    const p = (await db.query('SELECT DISTINCT plan FROM servicio')).rows.map((r) => r.plan).sort();
    expect(p).toEqual(['Básico', 'Estándar', 'Premium']);
  });

  test('cada tratamiento pertenece a una cita Completada', async () => {
    const r = await db.query(`SELECT COUNT(*)::int n FROM tratamiento t JOIN cita c ON c.id_cita=t.id_cita WHERE c.estado='Completada'`);
    expect(r.rows[0].n).toBe(4);
  });

  test('los usuarios sembrados pueden iniciar sesión', async () => {
    expect((await (await login(app, { correo: ADMIN_EMAIL, password: ADMIN_PASS })).get('/clientes')).status).toBe(200);
    const p = await login(app, { correo: 'carolina.ramirez@petcare.test', password: PERSONAL_PASS });
    expect((await p.get('/mis-citas')).status).toBe(200);
    expect((await p.get('/clientes')).status).toBe(403);
  });

  test('sembrar sin --reset sobre datos existentes falla', async () => {
    await expect(seed()).rejects.toThrow(/ya tiene datos/);
    expect((await request(app).get('/login')).status).toBe(200);
  });
});
