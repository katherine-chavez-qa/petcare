# PetCare – Credenciales de prueba

> Solo para demostración académica. Los datos son ficticios.
> Si defines `SEED_ADMIN_PASSWORD` / `SEED_PERSONAL_PASSWORD` antes de ejecutar el seed, esas contraseñas reemplazan a las de este archivo.

**URL de la aplicación:** _(completar tras el despliegue en Render, p. ej. `https://petcare-xxxx.onrender.com`)_

## Administrador (acceso completo)
| Campo | Valor |
|---|---|
| Correo | `admin@petcare.test` |
| Contraseña | `Admin#2026` |

## Personal de Servicios (solo sus citas y registro de tratamientos)
| Nombre | Cargo | Correo | Contraseña |
|---|---|---|---|
| Carolina Ramírez Soto (**usuario de prueba principal**) | Groomer | `carolina.ramirez@petcare.test` | `Personal#2026` |
| Andrés Felipe Muñoz | Médico veterinario | `andres.munoz@petcare.test` | `Personal#2026` |
| Daniela Ortiz Peña | Auxiliar veterinaria | `daniela.ortiz@petcare.test` | `Personal#2026` |

## Qué debería ver cada rol
- **Administrador:** menú con Clientes, Mascotas, Servicios, Personal, Citas y Tratamientos.
- **Personal:** únicamente «Mis citas»; si intenta abrir un módulo administrativo recibe «Acceso denegado».

## Recomendación de seguridad
Antes de compartir la URL públicamente más allá del grupo y el docente, cambia las contraseñas
(variables `SEED_*_PASSWORD` y `npm run db:seed -- --reset`) y evita publicar este archivo en un repositorio público.
