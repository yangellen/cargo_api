const router = module.exports = require('express').Router();
const url = require('url');
const path = require('path');

/*
router.get('/',async(req,res)=>{
    res.sendFile(path.join(__dirname,'/index.html'));
});

router.use('/login',require('./login'));*/

router.use('/boats',require('./boats'));
router.use('/owners',require('./owners'));



/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Auth0 Webapp sample Nodejs' });
});

module.exports = router;
