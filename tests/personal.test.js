const { db, setupDb, login, build, request, ADMIN, PERSONAL1 } = require('./helpers');

let app, admin;
beforeAll(async () => { await setupDb(); app = build(); admin = await login(app, ADMIN); });
afterAll(() => db.close());

const valido = { nombre: 'Camila Torres', cargo: 'Auxiliar de grooming', telefono: '3209876543' };

describe('Módulo Personal (R6)', () => {
  test('crear personal sin acceso', async () => {
    expect((await admin.form('/personal', valido)).status).toBe(302);
    const lista = await admin.get('/personal');
    expect(lista.text).toContain('Camila Torres');
    expect(lista.text).toContain('Sin acceso');
  });

  test('crear personal con usuario y que pueda iniciar sesión', async () => {
    const r = await admin.form('/personal', { ...valido, nombre: 'Jorge Díaz', correo_acceso: 'jorge@petcare.test', password: 'Clave12345' });
    expect(r.status).toBe(302);
    const u = (await db.query(`SELECT rol, id_personal FROM usuario WHERE correo='jorge@petcare.test'`)).rows[0];
    expect(u.rol).toBe('PERSONAL');
    expect(u.id_personal).not.toBeNull();
    const j = await login(app, { correo: 'jorge@petcare.test', password: 'Clave12345' });
    expect((await j.get('/')).status).toBe(200);
  });

  test('valida teléfono, cargo y correo de acceso', async () => {
    const r = await admin.form('/personal', { nombre: 'X', cargo: '', telefono: 'abc', correo_acceso: 'malo', password: '123' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('numérico');
    expect(r.text).toContain('El cargo es obligatorio');
    expect(r.text).toContain('formato válido');
    expect(r.text).toContain('al menos 8');
  });

  test('rechaza correo de acceso duplicado', async () => {
    const r = await admin.form('/personal', { ...valido, correo_acceso: ADMIN.correo, password: 'Clave12345' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('Ya existe un usuario');
  });

  test('editar personal', async () => {
    const id = (await db.query(`SELECT id_personal FROM personal WHERE nombre='Camila Torres'`)).rows[0].id_personal;
    expect((await admin.get(`/personal/${id}/editar`)).status).toBe(200);
    expect((await admin.form(`/personal/${id}`, { ...valido, cargo: 'Groomer senior' })).status).toBe(302);
    expect((await db.query('SELECT cargo FROM personal WHERE id_personal=$1', [id])).rows[0].cargo).toBe('Groomer senior');
  });

  test('no elimina personal con citas', async () => {
    const id = (await db.query(`SELECT id_personal FROM personal WHERE nombre='Ana Ruiz'`)).rows[0].id_personal;
    const c = (await db.query(`INSERT INTO cliente (nombre,telefono,correo) VALUES ('X','3000000000','x@x.co') RETURNING id_cliente`)).rows[0].id_cliente;
    const m = (await db.query(`INSERT INTO mascota (nombre,especie,edad,id_cliente) VALUES ('Rex','Perro',2,$1) RETURNING id_mascota`, [c])).rows[0].id_mascota;
    const s = (await db.query(`INSERT INTO servicio (nombre,plan,precio) VALUES ('Baño','Básico',30000) RETURNING id_servicio`)).rows[0].id_servicio;
    await db.query(`INSERT INTO cita (fecha,hora,id_mascota,id_servicio,id_personal) VALUES ('2099-01-01','09:00',$1,$2,$3)`, [m, s, id]);
    await admin.form(`/personal/${id}/eliminar`);
    expect((await admin.get('/personal')).text).toContain('No se puede eliminar a Ana Ruiz');
    expect((await db.query('SELECT 1 FROM personal WHERE id_personal=$1', [id])).rowCount).toBe(1);
  });

  test('elimina personal sin citas junto con su usuario', async () => {
    const id = (await db.query(`SELECT id_personal FROM personal WHERE nombre='Jorge Díaz'`)).rows[0].id_personal;
    await admin.form(`/personal/${id}/eliminar`);
    expect((await db.query('SELECT 1 FROM personal WHERE id_personal=$1', [id])).rowCount).toBe(0);
    expect((await db.query(`SELECT 1 FROM usuario WHERE correo='jorge@petcare.test'`)).rowCount).toBe(0);
  });

  test('rol PERSONAL no puede gestionar personal', async () => {
    const p = await login(app, PERSONAL1);
    expect((await p.get('/personal')).status).toBe(403);
    expect((await request(app).get('/personal')).status).toBe(302);
  });
});
