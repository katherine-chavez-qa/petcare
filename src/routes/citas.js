const { crudRouter, wrap } = require('../utils/crudRouter');
const c = require('../controllers/citaController');

const router = crudRouter(c);
router.post('/:id/cancelar', wrap(c.cancelar));

module.exports = router;
