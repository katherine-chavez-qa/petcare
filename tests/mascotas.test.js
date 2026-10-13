const { db, setupDb, login, build, ADMIN, PERSONAL1 } = require('./helpers');

let app, admin, idCliente;
beforeAll(async () => {
  await setupDb(); app = build(); admin = await login(app, ADMIN);
  idCliente = (await db.query(`INSERT INTO cliente (nombre,telefono,correo) VALUES ('Carlos Pérez','3112223344','carlos@correo.co') RETURNING id_cliente`)).rows[0].id_cliente;
});
afterAll(() => db.close());

const valida = () => ({ nombre: 'Luna', especie: 'Gato', raza: 'Siamés', edad: '2', id_cliente: String(idCliente) });

describe('Módulo Mascotas (R2)', () => {
  test('crear mascota asociada a un cliente', async () => {
    const r = await admin.form('/mascotas', valida());
    expect(r.status).toBe(302);
    const lista = await admin.get('/mascotas');
    expect(lista.text).toContain('Luna');
    expect(lista.text).toContain('Carlos Pérez');
  });

  test('rechaza edad negativa', async () => {
    const r = await admin.form('/mascotas', { ...valida(), edad: '-1' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('mayor o igual a 0');
  });

  test('rechaza edad no numérica', async () => {
    expect((await admin.form('/mascotas', { ...valida(), edad: 'abc' })).status).toBe(400);
  });

  test('rechaza campos obligatorios vacíos y cliente sin seleccionar', async () => {
    const r = await admin.form('/mascotas', { nombre: '', especie: '', edad: '1', id_cliente: '' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('El nombre es obligatorio');
    expect(r.text).toContain('La especie es obligatoria');
    expect(r.text).toContain('Debes seleccionar un cliente');
  });

  test('rechaza cliente inexistente', async () => {
    const r = await admin.form('/mascotas', { ...valida(), id_cliente: '9999' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('no existe');
  });

  test('editar mascota', async () => {
    const { rows } = await db.query(`SELECT id_mascota FROM mascota WHERE nombre='Luna'`);
    const id = rows[0].id_mascota;
    expect((await admin.get(`/mascotas/${id}/editar`)).status).toBe(200);
    expect((await admin.form(`/mascotas/${id}`, { ...valida(), edad: '3' })).status).toBe(302);
    expect((await db.query('SELECT edad FROM mascota WHERE id_mascota=$1', [id])).rows[0].edad).toBe(3);
  });

  test('filtrar por cliente y texto', async () => {
    expect((await admin.get(`/mascotas?cliente=${idCliente}`)).text).toContain('Luna');
    expect((await admin.get('/mascotas?q=siam')).text).toContain('Luna');
    expect((await admin.get('/mascotas?q=zzz')).text).toContain('No hay mascotas');
  });

  test('no elimina mascota con citas', async () => {
    const { rows } = await db.query(`SELECT id_mascota FROM mascota WHERE nombre='Luna'`);
    const id = rows[0].id_mascota;
    const s = (await db.query(`INSERT INTO servicio (nombre,descripcion,plan,precio) VALUES ('Baño','x','Básico',30000) RETURNING id_servicio`)).rows[0].id_servicio;
    const p = (await db.query('SELECT id_personal FROM personal LIMIT 1')).rows[0].id_personal;
    await db.query(`INSERT INTO cita (fecha,hora,estado,id_mascota,id_servicio,id_personal) VALUES ('2099-01-01','10:00','Programada',$1,$2,$3)`, [id, s, p]);
    await admin.form(`/mascotas/${id}/eliminar`);
    expect((await admin.get('/mascotas')).text).toContain('No se puede eliminar a Luna');
    expect((await db.query('SELECT 1 FROM mascota WHERE id_mascota=$1', [id])).rowCount).toBe(1);
  });

  test('elimina mascota sin relaciones', async () => {
    await admin.form('/mascotas', { ...valida(), nombre: 'Temporal' });
    const { rows } = await db.query(`SELECT id_mascota FROM mascota WHERE nombre='Temporal'`);
    await admin.form(`/mascotas/${rows[0].id_mascota}/eliminar`);
    expect((await db.query(`SELECT 1 FROM mascota WHERE nombre='Temporal'`)).rowCount).toBe(0);
  });

  test('rol PERSONAL no accede a mascotas', async () => {
    const p = await login(app, PERSONAL1);
    expect((await p.get('/mascotas')).status).toBe(403);
  });
});
