const { db, setupDb, login, build, request, ADMIN, PERSONAL1, PERSONAL2, futureDate, baseData, crearCita } = require('./helpers');

let app, admin, ana, luis, ids, d;
beforeAll(async () => {
  ids = await setupDb(); app = build(); d = await baseData();
  admin = await login(app, ADMIN); ana = await login(app, PERSONAL1); luis = await login(app, PERSONAL2);
});
afterAll(() => db.close());

const estado = async (id) => (await db.query('SELECT estado FROM cita WHERE id_cita=$1', [id])).rows[0].estado;
const trat = { descripcion: 'Baño medicado completo', fecha: futureDate(0), observaciones: 'Piel sensible' };

describe('Módulo Tratamientos (R5) y flujo del Personal (R6)', () => {
  let citaAna, citaLuis;
  beforeAll(async () => {
    citaAna = await crearCita({ ...d, p: ids.p1, fecha: futureDate(1), hora: '09:00' });
    citaLuis = await crearCita({ ...d, p: ids.p2, fecha: futureDate(1), hora: '10:00' });
  });

  test('PERSONAL ve solo sus citas asignadas', async () => {
    const r = await ana.get('/mis-citas');
    expect(r.status).toBe(200);
    expect(r.text).toContain(`/mis-citas/${citaAna}`);
    expect(r.text).not.toContain(`/mis-citas/${citaLuis}`);
  });

  test('PERSONAL no puede ver el detalle de la cita de otro (403)', async () => {
    expect((await ana.get(`/mis-citas/${citaLuis}`)).status).toBe(403);
  });

  test('PERSONAL no puede registrar tratamiento en cita ajena y la cita no cambia', async () => {
    const r = await ana.form(`/mis-citas/${citaLuis}/tratamiento`, trat);
    expect(r.status).toBe(403);
    expect(await estado(citaLuis)).toBe('Programada');
    expect((await db.query('SELECT 1 FROM tratamiento')).rowCount).toBe(0);
  });

  test('PERSONAL no accede a módulos de administración', async () => {
    for (const ruta of ['/clientes', '/mascotas', '/servicios', '/personal', '/citas', '/tratamientos']) {
      expect((await ana.get(ruta)).status).toBe(403);
    }
  });

  test('ADMIN no usa el módulo mis-citas (solo PERSONAL)', async () => {
    expect((await admin.get('/mis-citas')).status).toBe(403);
  });

  test('detalle de cita propia con formulario de tratamiento', async () => {
    const r = await ana.get(`/mis-citas/${citaAna}`);
    expect(r.status).toBe(200);
    expect(r.text).toContain('Registrar tratamiento realizado');
  });

  test('validación: descripción obligatoria y fecha válida', async () => {
    const r = await ana.form(`/mis-citas/${citaAna}/tratamiento`, { descripcion: '', fecha: 'xx' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('La descripción es obligatoria');
    expect(r.text).toContain('no es válida');
    expect(await estado(citaAna)).toBe('Programada');
  });

  test('registrar tratamiento cambia la cita a Completada', async () => {
    const r = await ana.form(`/mis-citas/${citaAna}/tratamiento`, trat);
    expect(r.status).toBe(302);
    expect(await estado(citaAna)).toBe('Completada');
    const t = (await db.query('SELECT * FROM tratamiento WHERE id_cita=$1', [citaAna])).rows[0];
    expect(t.id_mascota).toBe(d.m);
    expect(t.id_servicio).toBe(d.s);
    expect((await ana.get(`/mis-citas/${citaAna}`)).text).toContain('Baño medicado completo');
  });

  test('no se puede registrar otro tratamiento en una cita ya Completada', async () => {
    const r = await ana.form(`/mis-citas/${citaAna}/tratamiento`, trat);
    expect(r.status).toBe(400);
    expect(r.text).toContain('Solo se pueden registrar tratamientos en citas programadas');
    expect((await db.query('SELECT 1 FROM tratamiento WHERE id_cita=$1', [citaAna])).rowCount).toBe(1);
  });

  test('ADMIN registra tratamiento desde /tratamientos y la cita queda Completada', async () => {
    expect((await admin.get(`/tratamientos/nuevo?cita=${citaLuis}`)).status).toBe(200);
    const r = await admin.form('/tratamientos', { id_cita: String(citaLuis), ...trat });
    expect(r.status).toBe(302);
    expect(await estado(citaLuis)).toBe('Completada');
  });

  test('ADMIN: rechaza cita inexistente o sin seleccionar', async () => {
    const r = await admin.form('/tratamientos', { id_cita: '', ...trat });
    expect(r.status).toBe(400);
    expect(r.text).toContain('cita válida');
  });

  test('ADMIN: no registra tratamiento en cita cancelada', async () => {
    const c = await crearCita({ ...d, p: ids.p1, fecha: futureDate(3), hora: '12:00', estado: 'Cancelada' });
    const r = await admin.form('/tratamientos', { id_cita: String(c), ...trat });
    expect(r.status).toBe(400);
    expect(await estado(c)).toBe('Cancelada');
  });

  test('ADMIN: listar y buscar tratamientos', async () => {
    const r = await admin.get('/tratamientos?q=medicado');
    expect(r.text).toContain('Baño medicado completo');
    expect((await admin.get('/tratamientos?q=zzzz')).text).toContain('No hay tratamientos');
  });

  test('ADMIN: editar tratamiento', async () => {
    const id = (await db.query('SELECT id_tratamiento FROM tratamiento LIMIT 1')).rows[0].id_tratamiento;
    expect((await admin.get(`/tratamientos/${id}/editar`)).status).toBe(200);
    expect((await admin.form(`/tratamientos/${id}`, { ...trat, descripcion: 'Descripción corregida' })).status).toBe(302);
    expect((await db.query('SELECT descripcion FROM tratamiento WHERE id_tratamiento=$1', [id])).rows[0].descripcion).toBe('Descripción corregida');
    expect((await admin.form(`/tratamientos/${id}`, { ...trat, descripcion: '' })).status).toBe(400);
  });

  test('ADMIN: eliminar el único tratamiento devuelve la cita a Programada', async () => {
    const t = (await db.query('SELECT id_tratamiento, id_cita FROM tratamiento WHERE id_cita=$1', [citaLuis])).rows[0];
    await admin.form(`/tratamientos/${t.id_tratamiento}/eliminar`);
    expect((await db.query('SELECT 1 FROM tratamiento WHERE id_tratamiento=$1', [t.id_tratamiento])).rowCount).toBe(0);
    expect(await estado(citaLuis)).toBe('Programada');
  });

  test('sin sesión no se accede a mis-citas', async () => {
    expect((await request(app).get('/mis-citas')).status).toBe(302);
  });

  test('otro personal solo ve lo suyo', async () => {
    const r = await luis.get('/mis-citas');
    expect(r.text).toContain(`/mis-citas/${citaLuis}`);
    expect(r.text).not.toContain(`/mis-citas/${citaAna}`);
  });
});
