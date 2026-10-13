-- PetCare – esquema PostgreSQL (según diccionario de datos del proyecto)
-- Ajuste al modelo: se agrega la tabla "usuario" para el login.

CREATE TABLE IF NOT EXISTS cliente (
  id_cliente SERIAL PRIMARY KEY,
  nombre     VARCHAR(100) NOT NULL,
  telefono   VARCHAR(20)  NOT NULL,
  correo     VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS mascota (
  id_mascota SERIAL PRIMARY KEY,
  nombre     VARCHAR(80) NOT NULL,
  especie    VARCHAR(50) NOT NULL,
  raza       VARCHAR(80),
  edad       INT NOT NULL CHECK (edad >= 0),
  id_cliente INT NOT NULL REFERENCES cliente(id_cliente)
);

CREATE TABLE IF NOT EXISTS servicio (
  id_servicio SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  plan        VARCHAR(30) NOT NULL,
  precio      DECIMAL(12,2) NOT NULL CHECK (precio > 0)
);

CREATE TABLE IF NOT EXISTS personal (
  id_personal SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  cargo       VARCHAR(80)  NOT NULL,
  telefono    VARCHAR(20)  NOT NULL
);

CREATE TABLE IF NOT EXISTS cita (
  id_cita     SERIAL PRIMARY KEY,
  fecha       DATE NOT NULL,
  hora        TIME NOT NULL,
  estado      VARCHAR(20) NOT NULL DEFAULT 'Programada'
              CHECK (estado IN ('Programada','Completada','Cancelada')),
  id_mascota  INT NOT NULL REFERENCES mascota(id_mascota),
  id_servicio INT NOT NULL REFERENCES servicio(id_servicio),
  id_personal INT NOT NULL REFERENCES personal(id_personal)
);

-- Un mismo personal no puede tener dos citas activas a la misma fecha y hora.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cita_personal_fecha_hora
  ON cita (id_personal, fecha, hora) WHERE estado <> 'Cancelada';

CREATE TABLE IF NOT EXISTS tratamiento (
  id_tratamiento SERIAL PRIMARY KEY,
  descripcion    TEXT NOT NULL,
  fecha          DATE NOT NULL,
  observaciones  TEXT,
  id_mascota     INT NOT NULL REFERENCES mascota(id_mascota),
  id_cita        INT NOT NULL REFERENCES cita(id_cita),
  id_servicio    INT NOT NULL REFERENCES servicio(id_servicio)
);

-- Tabla adicional (ajuste al modelo) para autenticación y roles.
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario    SERIAL PRIMARY KEY,
  correo        VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  rol           VARCHAR(10) NOT NULL CHECK (rol IN ('ADMIN','PERSONAL')),
  id_personal   INT REFERENCES personal(id_personal)
);

CREATE INDEX IF NOT EXISTS ix_mascota_cliente ON mascota(id_cliente);
CREATE INDEX IF NOT EXISTS ix_cita_fecha ON cita(fecha);
CREATE INDEX IF NOT EXISTS ix_tratamiento_cita ON tratamiento(id_cita);
