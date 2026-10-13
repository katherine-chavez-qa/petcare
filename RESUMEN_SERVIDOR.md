# PetCare – Resumen de configuración del servidor

Insumo para el documento PMI (plan de gestión de la infraestructura / entorno de despliegue).

| Aspecto | Configuración |
|---|---|
| **URL pública** | https://petcare-seru.onrender.com |
| **Proveedor de aplicación** | Render (Web Service, plan gratuito *Free*) |
| **Región del servidor web** | _(confirmar en Render → Settings → Region; se recomendó Virginia, US East)_ |
| **Despliegue** | Continuo desde GitHub, rama `main` (repositorio privado `katherine-chavez-qa/petcare`) |
| **Comando de construcción** | `npm install --omit=dev` |
| **Comando de inicio** | `npm start` (`node src/server.js`) |
| **Versión de Node.js** | 20.x (variable `NODE_VERSION=20`; el desarrollo local usó Node 24, compatible) |
| **Framework** | Express 5.3 + plantillas EJS (renderizado en servidor) |
| **Proveedor de base de datos** | Neon (PostgreSQL administrado, plan gratuito) |
| **Región de la base de datos** | AWS us-east-1 (Virginia del Norte) |
| **Motor de base de datos** | PostgreSQL 17.11 |
| **Conexión a BD** | Cadena `DATABASE_URL` por variable de entorno, con SSL obligatorio (`sslmode=require`) |
| **Sesiones** | Almacenadas en PostgreSQL (tabla `session`), cookie `HttpOnly`, `Secure`, `SameSite=Lax`, vigencia 8 h |
| **Seguridad aplicada** | HTTPS (certificado de Render), HSTS y CSP con `helmet`, contraseñas con bcrypt, token CSRF, control de acceso por rol, consultas parametrizadas |
| **Variables de entorno** | `NODE_ENV`, `NODE_VERSION`, `DATABASE_URL`, `SESSION_SECRET` (nunca en el repositorio) |
| **Pruebas automatizadas** | Jest + Supertest: 88 de 88 casos aprobados (100 %) |

## Limitaciones del plan gratuito (riesgos a documentar)
- **Render Free:** el servicio se suspende tras ~15 minutos sin tráfico; la primera petición posterior tarda ~50 s o más. Capacidad limitada de CPU y memoria.
- **Neon Free:** almacenamiento y horas de cómputo limitados; la base se suspende por inactividad y se reactiva automáticamente.
- Sin copias de seguridad garantizadas ni acuerdo de nivel de servicio (SLA); adecuado para un entorno académico/demostrativo, no para producción real.
