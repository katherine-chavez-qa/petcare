const { db, setupDb, login, build, ADMIN, PERSONAL1 } = require('./helpers');

let app, admin;
beforeAll(async () => { await setupDb(); app = build(); admin = await login(app, ADMIN); });
afterAll(() => db.close());

const valido = { nombre: 'Baño y peluquería', descripcion: 'Baño completo con corte', plan: 'Estándar', precio: '45000' };

describe('Módulo Servicios y planes (R3)', () => {
  test('crear servicio válido', async () => {
    expect((await admin.form('/servicios', valido)).status).toBe(302);
    const lista = await admin.get('/servicios');
    expect(lista.text).toContain('Baño y peluquería');
    expect(lista.text).toContain('Estándar');
  });

  test('rechaza precio 0 o negativo', async () => {
    const r = await admin.form('/servicios', { ...valido, precio: '0' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('mayor a 0');
    expect((await admin.form('/servicios', { ...valido, precio: '-5' })).status).toBe(400);
  });

  test('rechaza precio no numérico', async () => {
    expect((await admin.form('/servicios', { ...valido, precio: 'abc' })).status).toBe(400);
  });

  test('rechaza plan inválido y nombre vacío', async () => {
    const r = await admin.form('/servicios', { ...valido, plan: 'Oro', nombre: '' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('El plan no es válido');
    expect(r.text).toContain('El nombre es obligatorio');
  });

  test('editar servicio', async () => {
    const id = (await db.query('SELECT id_servicio FROM servicio LIMIT 1')).rows[0].id_servicio;
    expect((await admin.get(`/servicios/${id}/editar`)).status).toBe(200);
    expect((await admin.form(`/servicios/${id}`, { ...valido, precio: '50000', plan: 'Premium' })).status).toBe(302);
    const s = (await db.query('SELECT * FROM servicio WHERE id_servicio=$1', [id])).rows[0];
    expect(s.precio).toBe(50000);
    expect(s.plan).toBe('Premium');
  });

  test('filtrar por plan', async () => {
    expect((await admin.get('/servicios?plan=Premium')).text).toContain('Baño y peluquería');
    expect((await admin.get('/servicios?plan=Básico')).text).toContain('No hay servicios');
  });

  test('no elimina servicio con citas', async () => {
    const id = (await db.query('SELECT id_servicio FROM servicio LIMIT 1')).rows[0].id_servicio;
    const c = (await db.query(`INSERT INTO cliente (nombre,telefono,correo) VALUES ('X','3000000000','x@x.co') RETURNING id_cliente`)).rows[0].id_cliente;
    const m = (await db.query(`INSERT INTO mascota (nombre,especie,edad,id_cliente) VALUES ('Rex','Perro',2,$1) RETURNING id_mascota`, [c])).rows[0].id_mascota;
    const p = (await db.query('SELECT id_personal FROM personal LIMIT 1')).rows[0].id_personal;
    await db.query(`INSERT INTO cita (fecha,hora,id_mascota,id_servicio,id_personal) VALUES ('2099-01-01','09:00',$1,$2,$3)`, [m, id, p]);
    await admin.form(`/servicios/${id}/eliminar`);
    expect((await admin.get('/servicios')).text).toContain('No se puede eliminar el servicio');
    expect((await db.query('SELECT 1 FROM servicio WHERE id_servicio=$1', [id])).rowCount).toBe(1);
  });

  test('elimina servicio sin citas', async () => {
    await admin.form('/servicios', { ...valido, nombre: 'Temporal' });
    const id = (await db.query(`SELECT id_servicio FROM servicio WHERE nombre='Temporal'`)).rows[0].id_servicio;
    await admin.form(`/servicios/${id}/eliminar`);
    expect((await db.query(`SELECT 1 FROM servicio WHERE nombre='Temporal'`)).rowCount).toBe(0);
  });

  test('rol PERSONAL no puede gestionar servicios', async () => {
    const p = await login(app, PERSONAL1);
    expect((await p.get('/servicios')).status).toBe(403);
    expect((await p.form('/servicios', valido)).status).toBe(403);
  });
});
