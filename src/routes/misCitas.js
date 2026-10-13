const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { wrap } = require('../utils/crudRouter');
const c = require('../controllers/misCitasController');

// Solo el rol PERSONAL, y únicamente sobre sus citas asignadas
router.use(requireAuth, requireRole('PERSONAL'));
router.param('id', (req, res, next, id) => {
  if (!/^\d+$/.test(id)) return res.status(404).render('error', { titulo: 'No encontrado', mensaje: 'La cita no existe.' });
  next();
});
router.get('/', wrap(c.index));
router.get('/:id', wrap(c.show));
router.post('/:id/tratamiento', wrap(c.registrarTratamiento));

module.exports = router;
