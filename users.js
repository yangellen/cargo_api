// routes/users.js

var express = require('express');
var secured = require('./lib/middleware/secured');
var router = express.Router();

//function use to parse JWT
function parseJwt (token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};

/* GET user profile. */
router.get('/user', secured(), function (req, res, next) {

  let id = parseJwt(req.user);
  
  res.render('user', {
    userProfile: req.user,
    userId: id["sub"]
  });
});

module.exports = router;