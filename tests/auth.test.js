const { db, setupDb, login, build, request, ADMIN, PERSONAL1 } = require('./helpers');

let app;
beforeAll(async () => { await setupDb(); app = build(); });
afterAll(() => db.close());

describe('Autenticación y roles', () => {
  test('la pantalla de login se muestra', async () => {
    const r = await request(app).get('/login');
    expect(r.status).toBe(200);
    expect(r.text).toContain('Iniciar');
  });

  test('rutas protegidas redirigen a /login sin sesión', async () => {
    const r = await request(app).get('/');
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe('/login');
  });

  test('login ADMIN correcto entra al inicio', async () => {
    const a = await login(app, ADMIN);
    const r = await a.get('/');
    expect(r.status).toBe(200);
    expect(r.text).toContain('Clientes'); // menú de admin
  });

  test('login PERSONAL correcto muestra menú de personal', async () => {
    const a = await login(app, PERSONAL1);
    const r = await a.get('/');
    expect(r.status).toBe(200);
    expect(r.text).toContain('Mis citas');
    expect(r.text).not.toContain('href="/clientes"');
  });

  test('contraseña incorrecta muestra error y no inicia sesión', async () => {
    const a = await login(app, { correo: ADMIN.correo, password: 'incorrecta' });
    const r = await a.get('/login');
    expect(r.text).toContain('incorrectos');
    expect((await a.get('/')).status).toBe(302);
  });

  test('usuario inexistente es rechazado', async () => {
    const a = await login(app, { correo: 'nadie@petcare.test', password: 'x' });
    expect((await a.get('/')).status).toBe(302);
  });

  test('campos vacíos generan mensaje de validación', async () => {
    const a = request.agent(app);
    const page = await a.get('/login');
    const t = /name="_csrf" value="([^"]+)"/.exec(page.text)[1];
    await a.post('/login').type('form').send({ _csrf: t, correo: '', password: '' });
    const r = await a.get('/login');
    expect(r.text).toContain('obligatorio');
  });

  test('POST sin token CSRF es rechazado', async () => {
    const r = await request(app).post('/login').type('form').send({ correo: ADMIN.correo, password: ADMIN.password });
    expect(r.status).toBe(403);
  });

  test('logout cierra la sesión', async () => {
    const a = await login(app, ADMIN);
    await a.form('/logout');
    expect((await a.get('/')).status).toBe(302);
  });

  test('ruta inexistente devuelve 404', async () => {
    const a = await login(app, ADMIN);
    expect((await a.get('/no-existe')).status).toBe(404);
  });
});
