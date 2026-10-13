const router = require('express').Router();
const c = require('../controllers/authController');

router.get('/login', c.showLogin);
router.post('/login', c.login);
router.post('/logout', c.logout);

module.exports = router;
