const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/dashboardController');

router.get('/', requireAuth, c.index);

module.exports = router;
