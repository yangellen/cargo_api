const router = module.exports = require('express').Router();
const url = require('url');
const path = require('path');

router.use('/boats',require('./boats'));
router.use('/owners',require('./owners'));
router.use('/users',require('./users'));


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Auth0 Webapp sample Nodejs' });
});

module.exports = router;
