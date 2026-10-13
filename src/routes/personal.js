const { crudRouter } = require('../utils/crudRouter');

module.exports = crudRouter(require('../controllers/personalController'));
