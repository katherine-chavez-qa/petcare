// Validaciones de servidor reutilizables. Cada una devuelve un mensaje de error o null.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const str = (v) => (v === undefined || v === null ? '' : String(v).trim());

const required = (v, label) =>
  (str(v) ? null : `${label} es ${/^la /i.test(label) ? 'obligatoria' : 'obligatorio'}.`);
const maxLen = (v, n, label) => (str(v).length > n ? `${label} no puede superar ${n} caracteres.` : null);
const email = (v, label = 'El correo') =>
  EMAIL_RE.test(str(v)) ? null : `${label} no tiene un formato válido.`;
const phone = (v, label = 'El teléfono') =>
  /^\d{7,15}$/.test(str(v)) ? null : `${label} debe ser numérico (7 a 15 dígitos, sin espacios ni signos).`;
const intMin = (v, min, label) => {
  const s = str(v);
  if (!/^-?\d+$/.test(s)) return `${label} debe ser un número entero.`;
  return parseInt(s, 10) >= min ? null : `${label} debe ser mayor o igual a ${min}.`;
};
const priceGt0 = (v, label = 'El precio') => {
  const s = str(v).replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return `${label} debe ser un número válido (máx. 2 decimales).`;
  return parseFloat(s) > 0 ? null : `${label} debe ser mayor a 0.`;
};
const oneOf = (v, list, label) => (list.includes(str(v)) ? null : `${label} no es válido.`);
const idPositive = (v, label) => (/^\d+$/.test(str(v)) && parseInt(v, 10) > 0 ? null : `Debes seleccionar ${label}.`);

// Fecha de hoy en Colombia (YYYY-MM-DD)
const todayCO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(str(v)) && !isNaN(new Date(str(v) + 'T00:00:00Z'));
const dateValid = (v, label = 'La fecha') => (isDate(v) ? null : `${label} no es válida.`);
const dateNotPast = (v, label = 'La fecha') =>
  !isDate(v) ? `${label} no es válida.` : str(v) < todayCO() ? `${label} no puede ser anterior a hoy.` : null;
const timeValid = (v, label = 'La hora') => (/^([01]\d|2[0-3]):[0-5]\d$/.test(str(v)) ? null : `${label} no es válida (HH:MM).`);

// Devuelve solo los errores no nulos
const collect = (...checks) => checks.filter(Boolean);

module.exports = {
  str, required, maxLen, email, phone, intMin, priceGt0, oneOf, idPositive,
  todayCO, dateValid, dateNotPast, timeValid, collect,
};
