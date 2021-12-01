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
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let buff = Buffer.from(base64, "base64");
  let jsonPayload = buff.toString('ascii');

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

//function to get all users
async function get_users() {
  const q = datastore.createQuery(USER);
  let users = await datastore.runQuery(q);
  let all_users = users[0].map(ds.fromDatastore)
  let count = all_users.length;
  all_users.push({"total_users":count})
  
  return all_users
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

//not allow to delete the whole list
router.delete('/',function(req,res){
  res.set('Allow', 'Post');
  res.status(405).json({'Error': 'Method not allowed'});
});

//not allow to modified the whole list
router.put('/',function(req,res){
  res.set('Allow', 'Post');
  res.status(405).json({'Error': 'Method not allowed'});
});

//not allow to modified the whole list
router.patch('/',function(req,res){
  res.set('Allow', 'Post');
  res.status(405).json({'Error': 'Method not allowed'});
});

//List all users
router.get('/', function (req, res) {

   //check accept types
   if (!req.accepts(['application/json'])){
    res.status(406).json({'Error': 'The requested content type is not available'});
    return
  }
  const users = get_users()
      .then((users) => {
          res.status(200).json(users);
      });
});

module.exports = router;