const { db, setupDb, login, build, ADMIN, PERSONAL1, baseData, crearCita } = require('./helpers');
const { todayCO } = require('../src/utils/validate');

let app, ids, d;
beforeAll(async () => {
  ids = await setupDb(); app = build(); d = await baseData();
  await crearCita({ ...d, p: ids.p1, fecha: todayCO(), hora: '08:00' });
  await crearCita({ ...d, p: ids.p2, fecha: todayCO(), hora: '09:00' });
  await crearCita({ ...d, p: ids.p1, fecha: '2099-01-01', hora: '09:00', estado: 'Cancelada' });
});
afterAll(() => db.close());

describe('Dashboard', () => {
  test('ADMIN ve totales y todas las citas del día', async () => {
    const a = await login(app, ADMIN);
    const r = await a.get('/');
    expect(r.status).toBe(200);
    expect(r.text).toContain('Citas de hoy');
    expect(r.text).toContain('Ana Ruiz');
    expect(r.text).toContain('Luis Mora');
    expect(r.text).toContain('Clientes');
  });

  test('PERSONAL solo ve sus citas del día', async () => {
    const a = await login(app, PERSONAL1);
    const r = await a.get('/');
    expect(r.text).toContain('Citas de hoy');
    expect(r.text).toContain('08:00');
    expect(r.text).not.toContain('09:00</td>');
  });
});
