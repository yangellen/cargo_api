// routes/users.js
var express = require('express');
var secured = require('./lib/middleware/secured');
var router = express.Router();

//to store user in datastore
const bodyParser = require('body-parser');
const ds = require('./datastore');
const datastore = ds.datastore;

const USER = "User";

router.use(bodyParser.json());

const url = require('url');

//function use to parse JWT
function parseJwt (token) {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));

  return JSON.parse(jsonPayload);
};

//function use to store user information in datastore
async function post_user(userInfo) {
  //check if user exist 
  if(!(await create_user(userInfo["sub"]))){
    return
  }
  var key = datastore.key(USER);
  const new_user = { "sub": userInfo["sub"],"email": userInfo["email"]};
  return datastore.save({ "key": key, "data": new_user }).then(() => { return key });
}

//function to check if user exist
async function create_user(sub){
  let query = datastore.createQuery(USER);
  let result = await datastore.runQuery(query);
  let users = result[0];

  users.map(ds.fromDatastore);

  for(let i = 0; i < users.length; i++){
    if(users[i].sub == sub){
      return false
    }
  }
  return true
}

/* GET user information and also store user information in datastore. */
router.get('/user', secured(), function (req, res, next) {

  let id = parseJwt(req.user);

  //store user information
  post_user(id);
  
  res.render('user', {
    userProfile: req.user,
    userId: id["sub"]
  });
});

module.exports = router;