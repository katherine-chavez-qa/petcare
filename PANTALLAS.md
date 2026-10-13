# PetCare – Listado de pantallas

Insumo para el manual de usuario y las capturas. Todas las pantallas (excepto el login) requieren sesión iniciada.
Rol **A** = Administrador · Rol **P** = Personal de Servicios.

| # | Pantalla | Ruta | Rol | Qué hace |
|---|---|---|---|---|
| 1 | Inicio de sesión | `/login` | Público | Formulario de correo y contraseña. Muestra mensaje de error si las credenciales son incorrectas. |
| 2 | Dashboard (Administrador) | `/` | A | Totales (clientes, mascotas, servicios, personal, tratamientos, citas por estado) y tabla de las citas del día. |
| 3 | Dashboard (Personal) | `/` | P | Totales de sus citas por estado y sus citas del día. |
| 4 | Lista de clientes | `/clientes` | A | Lista con búsqueda por nombre, correo o teléfono; muestra cuántas mascotas tiene cada cliente. Acciones editar/eliminar. |
| 5 | Nuevo cliente | `/clientes/nuevo` | A | Formulario (nombre, teléfono numérico, correo) con validaciones. |
| 6 | Editar cliente | `/clientes/:id/editar` | A | Modifica los datos del cliente. |
| 7 | Lista de mascotas | `/mascotas` | A | Lista con búsqueda y filtro por cliente (dueño). |
| 8 | Nueva mascota | `/mascotas/nuevo` | A | Formulario (nombre, especie, raza, edad ≥ 0, cliente dueño). |
| 9 | Editar mascota | `/mascotas/:id/editar` | A | Modifica la mascota o la reasigna a otro cliente. |
| 10 | Servicios y planes | `/servicios` | A | Catálogo agrupado por plan (Básico, Estándar, Premium) con precio; búsqueda y filtro por plan. |
| 11 | Nuevo servicio | `/servicios/nuevo` | A | Formulario (nombre, descripción, plan, precio > 0). |
| 12 | Editar servicio | `/servicios/:id/editar` | A | Modifica el servicio. |
| 13 | Lista de personal | `/personal` | A | Personal con cargo, teléfono y correo de acceso (o «Sin acceso»). |
| 14 | Nuevo personal | `/personal/nuevo` | A | Formulario (nombre, cargo, teléfono) y, opcionalmente, correo y contraseña para crear su usuario. |
| 15 | Editar personal | `/personal/:id/editar` | A | Modifica datos; permite crear el acceso si aún no lo tiene. |
| 16 | Lista de citas | `/citas` | A | Todas las citas con filtros por fecha, estado y personal. Acciones: editar, registrar tratamiento, cancelar, eliminar. |
| 17 | Programar cita | `/citas/nuevo` | A | Formulario (fecha no pasada, hora, mascota, servicio, personal). Valida choque de horario del personal. |
| 18 | Editar cita | `/citas/:id/editar` | A | Reprograma una cita en estado Programada. |
| 19 | Lista de tratamientos | `/tratamientos` | A | Historial de tratamientos con mascota, servicio, personal y observaciones; búsqueda. |
| 20 | Registrar tratamiento | `/tratamientos/nuevo` (opcional `?cita=ID`) | A | Elige una cita Programada y registra el tratamiento; la cita pasa a **Completada**. |
| 21 | Editar tratamiento | `/tratamientos/:id/editar` | A | Corrige descripción, fecha y observaciones. |
| 22 | Mis citas | `/mis-citas` | P | Solo las citas asignadas al usuario, con filtro por estado. |
| 23 | Detalle de mi cita | `/mis-citas/:id` | P | Datos de la cita, tratamientos ya registrados y formulario para registrar el tratamiento realizado (la cita pasa a **Completada**). |
| 24 | Acceso denegado | (403) | A/P | Se muestra cuando un rol intenta entrar a una sección que no le corresponde, o a una cita ajena. |
| 25 | Página no encontrada | (404) | A/P | Ruta o registro inexistente. |

## Mensajes visibles
Cada acción muestra un aviso verde (éxito) o rojo (error/validación) en la parte superior de la pantalla. Ejemplos:
- «Cliente registrado correctamente.»
- «No se puede eliminar a X: tiene N mascota(s) registrada(s)…»
- «El personal seleccionado ya tiene una cita programada en esa fecha y hora.»
- «Tratamiento registrado y cita marcada como Completada.»

## Escenarios sugeridos para las capturas
1. Login → dashboard del administrador.
2. Crear un cliente con datos inválidos (ver mensajes) y luego válidos.
3. Intentar eliminar un cliente con mascotas.
4. Programar una cita y repetirla para mostrar el choque de horario.
5. Iniciar sesión como Personal, abrir «Mis citas» y registrar un tratamiento.
6. Intentar abrir `/clientes` como Personal (acceso denegado).
