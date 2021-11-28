const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat";
const USER = "User";

router.use(bodyParser.json());



async function get_boats(owner_id) {
    
    //return all public boats by owner    
    const query = datastore.createQuery(BOAT).filter('owner','=', owner_id).filter('public','=',true);
    let boats = await datastore.runQuery(query);
    if (!boats[0]){return []}
    return boats[0].map(ds.fromDatastore);
    
}

async function get_users() {
    const q = datastore.createQuery(USER);
    let users = await datastore.runQuery(q);
    let all_users = useres[0].map(ds.fromDatastore)
    
    return all_users
  }

  /* ------------- Begin Controller Functions ------------- */
//List boats depends on status
router.get('/:owner_id/boats', function (req, res) {  
    
    const results = get_boats(req.params.owner_id)
        .then((results) => {
            res.status(200).json(results);
        });
});

//List all users
router.get('/', function (req, res) {
    const users = get_users()
        .then((users) => {
            res.status(200).json(users);
        });
  });

module.exports = router