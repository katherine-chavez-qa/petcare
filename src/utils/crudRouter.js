const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');

// Convierte controladores async en middlewares que propagan errores a Express.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Router CRUD estándar solo para ADMIN: index, nuevo, crear, editar, actualizar, eliminar.
function crudRouter(c) {
  const router = express.Router();
  router.use(requireAuth, requireRole('ADMIN'));
  router.param('id', (req, res, next, id) => {
    if (!/^\d+$/.test(id)) {
      return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'El registro no existe.' });
    }
    next();
  });
  router.get('/', wrap(c.index));
  router.get('/nuevo', wrap(c.nuevo));
  router.post('/', wrap(c.crear));
  router.get('/:id/editar', wrap(c.editar));
  router.post('/:id', wrap(c.actualizar));
  router.post('/:id/eliminar', wrap(c.eliminar));
  return router;
}

module.exports = { crudRouter, wrap };
