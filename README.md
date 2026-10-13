# 🐾 PetCare – Gestión de Servicios para Mascotas a Domicilio

Aplicativo web del proyecto académico del módulo **Gerencia de Proyectos Informáticos** (Politécnico Grancolombiano, metodología PMI).
Implementa únicamente el alcance del documento del proyecto (R1–R6). **Fuera de alcance:** pagos en línea, geolocalización/GPS, app móvil, chat e integraciones con otras plataformas.

## Descripción
- **Administrador:** gestiona clientes, mascotas, servicios/planes, personal, citas y tratamientos (CRUD completo).
- **Personal de Servicios:** consulta **solo** sus citas asignadas y registra los tratamientos realizados; al registrarlos, la cita pasa a *Completada*.

## Stack
| Capa | Tecnología |
|---|---|
| Servidor | Node.js 20+ · Express 5 · plantillas EJS (render en servidor, sin SPA) |
| Base de datos | PostgreSQL (Neon, plan gratuito) con consultas parametrizadas (`pg`) |
| Autenticación | `express-session` (sesiones guardadas en PostgreSQL) · `bcryptjs` · CSRF por token · `helmet` |
| Interfaz | Pico.css (CDN), responsive, en español |
| Pruebas | Jest + Supertest (PGlite = PostgreSQL en memoria, sin instalar nada) |
| Despliegue | Render (web service) + Neon, desde GitHub |

Estructura MVC:
```
src/
  app.js, server.js
  config/db.js          conexión (pg Pool / PGlite en pruebas)
  routes/               rutas por módulo
  controllers/          lógica de cada módulo
  models/               consultas SQL
  middleware/           auth, roles, flash, CSRF
  utils/                validaciones y router CRUD
  views/                plantillas EJS
db/ schema.sql · init.js · seed.js
tests/                  pruebas automatizadas
```

## Ajuste al modelo de datos (para actualizar el MER y el diccionario)
Se respetaron las 6 tablas y campos del diccionario de datos (`cliente`, `mascota`, `servicio`, `personal`, `cita`, `tratamiento`).
Para el inicio de sesión se **agregó una tabla**:

| Tabla `usuario` | Tipo | Notas |
|---|---|---|
| `id_usuario` | SERIAL, PK | |
| `correo` | VARCHAR(120), UNIQUE | usuario de acceso |
| `password_hash` | VARCHAR(100) | hash bcrypt (nunca texto plano) |
| `rol` | VARCHAR(10) | `'ADMIN'` o `'PERSONAL'` |
| `id_personal` | INT, FK → `personal`, NULL | solo para rol PERSONAL; NULL para ADMIN |

Relación: `personal` 1 — 0..1 `usuario`.
Detalles de implementación adicionales: la tabla `session` (la crea `connect-pg-simple` automáticamente) guarda las sesiones, y un **índice único parcial** en `cita (id_personal, fecha, hora) WHERE estado <> 'Cancelada'` refuerza en la base de datos la regla de no choque de horarios.

## Reglas de negocio y calidad implementadas
- Validación en servidor: campos obligatorios, correo válido, teléfono numérico (7–15 dígitos), edad ≥ 0, precio > 0, fecha de cita no pasada (zona horaria Colombia).
- Integridad referencial con mensajes claros: no se elimina un cliente con mascotas, ni un servicio/personal con citas (tampoco una mascota con citas/tratamientos, ni una cita con tratamientos).
- Un mismo personal no puede tener dos citas activas en la misma fecha y hora (las canceladas liberan el horario).
- Estados de cita: Programada → Completada (al registrar tratamiento) o Cancelada. Solo las citas Programadas se pueden editar/cancelar.
- Avisos de éxito/error visibles en cada acción.

## Ejecutar localmente

Requisitos: Node.js 20 o superior.

```bash
npm install
npm test            # pruebas (no requieren base de datos instalada)
npm run demo        # demo con datos de ejemplo en http://localhost:3100 (PostgreSQL en memoria)
```

Con una base de datos real (Neon o PostgreSQL local):
```bash
cp .env.example .env      # completar DATABASE_URL y SESSION_SECRET
npm run db:init           # crea las tablas
npm run db:seed           # carga datos de ejemplo (usa -- --reset para reiniciar)
npm start                 # http://localhost:3000
```
Credenciales en [CREDENCIALES_PRUEBA.md](CREDENCIALES_PRUEBA.md). Pantallas en [PANTALLAS.md](PANTALLAS.md). Manual de usuario: [docs/Manual_de_Usuario_PetCare.docx](docs/Manual_de_Usuario_PetCare.docx) (capturas en `docs/capturas`).

Datos semilla: 1 administrador, 3 personas de personal (con usuario), 5 clientes, 8 mascotas, 6 servicios en planes Básico/Estándar/Premium, 10 citas en distintos estados y 4 tratamientos.

## Despliegue paso a paso (Neon + Render)

### 1. Subir el código a GitHub
1. Crea un repositorio vacío en GitHub (p. ej. `petcare`).
2. En la carpeta del proyecto: `git remote add origin <URL-del-repo>` y `git push -u origin main`.
   El archivo `.env` está en `.gitignore`: **no se sube**.

### 2. Crear la base de datos en Neon
1. Ingresa a <https://neon.tech> y crea una cuenta (plan gratuito).
2. **Create project** → nombre `petcare`, versión de Postgres 16 o superior, región **AWS US East (N. Virginia o Ohio)** (la más cercana a Render Ohio).
3. En el panel, botón **Connect** → copia la *connection string* (formato `postgresql://usuario:clave@ep-xxxx.../neondb?sslmode=require`). Usa la cadena **directa o con pooler**; ambas funcionan.

### 3. Crear las tablas y los datos de ejemplo (desde tu computador)
```bash
cp .env.example .env     # en Windows: copy .env.example .env
# edita .env: pega DATABASE_URL de Neon y define SESSION_SECRET
npm run db:init
npm run db:seed
```
(También puedes pegar `db/schema.sql` en el *SQL Editor* de Neon.)

### 4. Crear el servicio en Render
1. Ingresa a <https://render.com> → **New +** → **Web Service** → conecta tu cuenta de GitHub y elige el repositorio.
2. Configuración:
   - **Region:** Ohio (US East) · **Runtime:** Node · **Branch:** `main`
   - **Build Command:** `npm install --omit=dev`
   - **Start Command:** `npm start`
   - **Instance type:** Free
3. En **Environment** agrega:
   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | cadena de conexión de Neon |
   | `SESSION_SECRET` | cadena aleatoria larga (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `NODE_VERSION` | `20` |
4. **Create Web Service**. Al terminar el despliegue Render muestra la URL pública (`https://….onrender.com`).

### 5. Verificar
Abre la URL, inicia sesión con las credenciales de prueba y revisa el dashboard.
Nota: en el plan gratuito de Render el servicio se **duerme tras ~15 min sin tráfico**; la primera visita tarda unos 30–60 s en despertar.

## Pruebas automatizadas
```bash
npm test
```
Cubren: login por rol, CRUD de cada módulo, restricción de acceso del rol PERSONAL, regla de choque de citas, cambio de estado al registrar tratamiento, validaciones e integridad referencial. Por defecto usan PGlite (PostgreSQL en memoria); para correrlas contra un Postgres real define `DATABASE_URL_TEST`.

## Matriz de trazabilidad

| Requisito | Módulo | Rutas | Pruebas |
|---|---|---|---|
| **R1** Registrar clientes | Clientes | `GET/POST /clientes`, `GET /clientes/nuevo`, `GET /clientes/:id/editar`, `POST /clientes/:id`, `POST /clientes/:id/eliminar` | `tests/clientes.test.js` |
| **R2** Registrar mascotas por cliente | Mascotas | `GET/POST /mascotas`, `/mascotas/nuevo`, `/mascotas/:id/editar`, `POST /mascotas/:id`, `/mascotas/:id/eliminar` | `tests/mascotas.test.js` |
| **R3** Consultar/gestionar planes y servicios | Servicios | `GET/POST /servicios`, `/servicios/nuevo`, `/servicios/:id/editar`, `POST /servicios/:id`, `/servicios/:id/eliminar` | `tests/servicios.test.js` |
| **R4** Programar citas | Citas | `GET/POST /citas`, `/citas/nuevo`, `/citas/:id/editar`, `POST /citas/:id`, `/citas/:id/cancelar`, `/citas/:id/eliminar` | `tests/citas.test.js` (incluye fecha pasada y choque de horario) |
| **R5** Registrar tratamientos/servicios realizados | Tratamientos | `GET/POST /tratamientos`, `/tratamientos/nuevo`, `/tratamientos/:id/editar`, `POST /tratamientos/:id`, `/tratamientos/:id/eliminar`, `POST /mis-citas/:id/tratamiento` | `tests/tratamientos.test.js` (cambio de estado a Completada) |
| **R6** Asignar personal responsable | Personal + Mis citas | `GET/POST /personal`, `/personal/nuevo`, `/personal/:id/editar`, `POST /personal/:id`, `/personal/:id/eliminar`; `GET /mis-citas`, `GET /mis-citas/:id` | `tests/personal.test.js`, `tests/tratamientos.test.js` (restricción del rol PERSONAL) |
| Acceso y roles | Auth | `GET/POST /login`, `POST /logout` | `tests/auth.test.js` |
| Vista general | Dashboard | `GET /` | `tests/dashboard.test.js` |
| Datos de ejemplo | Seed | `npm run db:seed` | `tests/seed.test.js` |
