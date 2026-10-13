const { db, setupDb, login, build, ADMIN, PERSONAL1, futureDate, baseData, crearCita } = require('./helpers');

let app, admin, ids, d;
beforeAll(async () => {
  ids = await setupDb(); app = build(); admin = await login(app, ADMIN); d = await baseData();
});
afterAll(() => db.close());

const cuerpo = (extra = {}) => ({
  fecha: futureDate(5), hora: '09:00', id_mascota: String(d.m), id_servicio: String(d.s), id_personal: String(ids.p1), ...extra,
});

describe('Módulo Citas (R4)', () => {
  test('programar cita válida (queda Programada)', async () => {
    const r = await admin.form('/citas', cuerpo());
    expect(r.status).toBe(302);
    const c = (await db.query('SELECT estado FROM cita')).rows[0];
    expect(c.estado).toBe('Programada');
    const lista = await admin.get('/citas');
    expect(lista.text).toContain('Max');
    expect(lista.text).toContain('Ana Ruiz');
  });

  test('rechaza fecha pasada', async () => {
    const r = await admin.form('/citas', cuerpo({ fecha: '2020-01-01', hora: '11:00' }));
    expect(r.status).toBe(400);
    expect(r.text).toContain('no puede ser anterior a hoy');
  });

  test('rechaza campos obligatorios vacíos', async () => {
    const r = await admin.form('/citas', { fecha: '', hora: '', id_mascota: '', id_servicio: '', id_personal: '' });
    expect(r.status).toBe(400);
    expect(r.text).toContain('Debes seleccionar una mascota');
    expect(r.text).toContain('Debes seleccionar un servicio');
    expect(r.text).toContain('Debes seleccionar un miembro del personal');
  });

  test('regla de choque: mismo personal, misma fecha y hora', async () => {
    const r = await admin.form('/citas', cuerpo()); // igual a la primera cita
    expect(r.status).toBe(400);
    expect(r.text).toContain('ya tiene una cita programada en esa fecha y hora');
    expect((await db.query('SELECT COUNT(*)::int n FROM cita')).rows[0].n).toBe(1);
  });

  test('mismo horario con otro personal sí se permite', async () => {
    expect((await admin.form('/citas', cuerpo({ id_personal: String(ids.p2) }))).status).toBe(302);
  });

  test('mismo personal en otra hora sí se permite', async () => {
    expect((await admin.form('/citas', cuerpo({ hora: '14:30' }))).status).toBe(302);
  });

  test('una cita cancelada libera el horario', async () => {
    const id = (await db.query(`SELECT id_cita FROM cita WHERE id_personal=$1 AND hora='09:00'`, [ids.p1])).rows[0].id_cita;
    await admin.form(`/citas/${id}/cancelar`);
    expect((await db.query('SELECT estado FROM cita WHERE id_cita=$1', [id])).rows[0].estado).toBe('Cancelada');
    expect((await admin.form('/citas', cuerpo())).status).toBe(302);
  });

  test('la restricción también existe a nivel de base de datos', async () => {
    await expect(crearCita({ m: d.m, s: d.s, p: ids.p1, fecha: futureDate(5), hora: '09:00' })).rejects.toThrow();
  });

  test('editar cita y validar choque al editar', async () => {
    const id = (await db.query(`SELECT id_cita FROM cita WHERE id_personal=$1 AND hora='14:30'`, [ids.p1])).rows[0].id_cita;
    expect((await admin.get(`/citas/${id}/editar`)).status).toBe(200);
    // mover a 09:00 del mismo personal => choque con la cita recién creada
    const choque = await admin.form(`/citas/${id}`, cuerpo({ hora: '09:00' }));
    expect(choque.status).toBe(400);
    const ok = await admin.form(`/citas/${id}`, cuerpo({ hora: '16:00' }));
    expect(ok.status).toBe(302);
    expect((await db.query('SELECT hora FROM cita WHERE id_cita=$1', [id])).rows[0].hora).toContain('16:00');
  });

  test('editar una cita sin cambios no se bloquea a sí misma', async () => {
    const id = (await db.query(`SELECT id_cita FROM cita WHERE id_personal=$1 AND hora='16:00'`, [ids.p1])).rows[0].id_cita;
    expect((await admin.form(`/citas/${id}`, cuerpo({ hora: '16:00' }))).status).toBe(302);
  });

  test('no se puede editar una cita cancelada', async () => {
    const id = (await db.query(`SELECT id_cita FROM cita WHERE estado='Cancelada'`)).rows[0].id_cita;
    expect((await admin.get(`/citas/${id}/editar`)).status).toBe(302);
  });

  test('filtros por estado, fecha y personal', async () => {
    expect((await admin.get('/citas?estado=Cancelada')).text).toContain('Cancelada');
    expect((await admin.get(`/citas?fecha=${futureDate(5)}`)).status).toBe(200);
    expect((await admin.get(`/citas?personal=${ids.p2}`)).text).toContain('Luis Mora');
  });

  test('eliminar cita sin tratamientos', async () => {
    const id = await crearCita({ m: d.m, s: d.s, p: ids.p2, fecha: futureDate(9), hora: '08:00' });
    await admin.form(`/citas/${id}/eliminar`);
    expect((await db.query('SELECT 1 FROM cita WHERE id_cita=$1', [id])).rowCount).toBe(0);
  });

  test('no elimina cita con tratamientos', async () => {
    const id = await crearCita({ m: d.m, s: d.s, p: ids.p2, fecha: futureDate(9), hora: '08:30', estado: 'Completada' });
    await db.query(`INSERT INTO tratamiento (descripcion,fecha,id_mascota,id_cita,id_servicio) VALUES ('x','2099-01-01',$1,$2,$3)`, [d.m, id, d.s]);
    await admin.form(`/citas/${id}/eliminar`);
    expect((await admin.get('/citas')).text).toContain('tiene 1 tratamiento');
    expect((await db.query('SELECT 1 FROM cita WHERE id_cita=$1', [id])).rowCount).toBe(1);
  });

  test('rol PERSONAL no puede gestionar citas', async () => {
    const p = await login(app, PERSONAL1);
    expect((await p.get('/citas')).status).toBe(403);
    expect((await p.form('/citas', cuerpo({ hora: '17:00' }))).status).toBe(403);
  });
});
