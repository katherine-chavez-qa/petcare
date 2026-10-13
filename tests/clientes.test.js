const { db, setupDb, login, build, request, ADMIN, PERSONAL1 } = require('./helpers');

let app, admin;
beforeAll(async () => { await setupDb(); app = build(); admin = await login(app, ADMIN); });
afterAll(() => db.close());

const valido = { nombre: 'María Fernanda Gómez', telefono: '3101234567', correo: 'maria@correo.co' };

describe('Módulo Clientes (R1)', () => {
  test('crear cliente válido', async () => {
    const r = await admin.form('/clientes', valido);
    expect(r.status).toBe(302);
    const lista = await admin.get('/clientes');
    expect(lista.text).toContain('María Fernanda Gómez');
    expect(lista.text).toContain('registrado correctamente');
  });

  test('rechaza nombre vacío', async () => {
    const r = await admin.form('/clientes', { ...valido, nombre: '' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('El nombre es obligatorio');
  });

  test('rechaza correo con formato inválido', async () => {
    const r = await admin.form('/clientes', { ...valido, correo: 'no-es-correo' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('formato válido');
  });

  test('rechaza teléfono no numérico', async () => {
    const r = await admin.form('/clientes', { ...valido, telefono: '310-abc' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('numérico');
  });

  test('buscar cliente', async () => {
    const r = await admin.get('/clientes?q=gómez');
    expect(r.text).toContain('María Fernanda');
    const r2 = await admin.get('/clientes?q=zzzz');
    expect(r2.text).toContain('No hay clientes');
  });

  test('editar cliente', async () => {
    const { rows } = await db.query('SELECT id_cliente FROM cliente LIMIT 1');
    const id = rows[0].id_cliente;
    expect((await admin.get(`/clientes/${id}/editar`)).status).toBe(200);
    const r = await admin.form(`/clientes/${id}`, { ...valido, nombre: 'María F. Gómez' });
    expect(r.status).toBe(302);
    expect((await admin.get('/clientes')).text).toContain('María F. Gómez');
  });

  test('editar con datos inválidos muestra errores', async () => {
    const { rows } = await db.query('SELECT id_cliente FROM cliente LIMIT 1');
    const r = await admin.form(`/clientes/${rows[0].id_cliente}`, { ...valido, telefono: '' });
    expect(r.status).toBe(400);
  });

  test('cliente inexistente devuelve 404', async () => {
    expect((await admin.get('/clientes/9999/editar')).status).toBe(404);
    expect((await admin.get('/clientes/abc/editar')).status).toBe(404);
  });

  test('no permite eliminar cliente con mascotas (mensaje claro)', async () => {
    const { rows } = await db.query('SELECT id_cliente FROM cliente LIMIT 1');
    const id = rows[0].id_cliente;
    await db.query(`INSERT INTO mascota (nombre,especie,raza,edad,id_cliente) VALUES ('Toby','Perro','Criollo',3,$1)`, [id]);
    await admin.form(`/clientes/${id}/eliminar`);
    const lista = await admin.get('/clientes');
    expect(lista.text).toContain('tiene 1 mascota');
    expect((await db.query('SELECT 1 FROM cliente WHERE id_cliente=$1', [id])).rowCount).toBe(1);
  });

  test('eliminar cliente sin mascotas', async () => {
    await admin.form('/clientes', { nombre: 'Temporal', telefono: '3200000000', correo: 't@t.co' });
    const { rows } = await db.query(`SELECT id_cliente FROM cliente WHERE nombre='Temporal'`);
    await admin.form(`/clientes/${rows[0].id_cliente}/eliminar`);
    expect((await db.query(`SELECT 1 FROM cliente WHERE nombre='Temporal'`)).rowCount).toBe(0);
  });

  test('rol PERSONAL no puede acceder a clientes', async () => {
    const p = await login(app, PERSONAL1);
    expect((await p.get('/clientes')).status).toBe(403);
    expect((await p.form('/clientes', valido)).status).toBe(403);
  });

  test('sin sesión redirige a login', async () => {
    const r = await request(app).get('/clientes');
    expect(r.status).toBe(302);
  });
});
