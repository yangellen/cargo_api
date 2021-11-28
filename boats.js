const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat";

router.use(bodyParser.json());

const url = require('url');

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');
//const { appendFile } = require('fs');

const DOMAIN = 'yange493.us.auth0.com';

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://${DOMAIN}/`,
    algorithms: ['RS256'],
  });

/* ------------- Begin Boat Model Functions ------------- */
function post_boats(owner,name, type, length, public) {
    var key = datastore.key(BOAT);
    const new_boat = { "owner": owner,"name": name, "type": type, "length": length , "public": public};
    return datastore.save({ "key": key, "data": new_boat }).then(() => { return key });
}

/**
 * The function datastore.query returns an array, where the element at index 0
 * is itself an array. Each element in the array at element 0 is a JSON object
 * with an entity fromt the type "boat".
 */
async function get_boats(owner) {
    
    //return all boats by owner
    if (owner != null){
       
        const query = datastore.createQuery(BOAT).filter('owner','=', owner);
        let boats = await datastore.runQuery(query);
        return boats[0].map(ds.fromDatastore);
    }
    else{
       
        const query = datastore.createQuery(BOAT).filter('public','=', true);
        let boats = await datastore.runQuery(query);
        return boats[0].map(ds.fromDatastore);      
    }    
}

//
async function delete_boat(id, owner) {
    //console.log(id);
    //console.log(owner);

    const key = datastore.key([BOAT, parseInt(id, 10)]);
    const boats = await datastore.get(key);

    //console.log(boats);
    //console.log(boats[0]);

    if (boats[0] === undefined || boats[0] === null) {
        return boats[0]
    } 
    //check if boat belong to owner
    if (boats[0].owner === owner){
        return datastore.delete(key);
    }
    return  403   
}




/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.use(checkJwt)
router.use(function (err, req, res, next) {
    req.errorStatus = err.name;
    
    next();
})

// Add a boat 
router.post('/',function (req, res) {
    if(req.errorStatus === 'UnauthorizedError'){      
      res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
      return
    }

    let owner = req.user.sub;
    let name = req.body.name;
    let type = req.body.type;
    let length = req.body.length;
    let public = req.body.public;
    
    /* Request need to have all 4 attributes */
    if (name && type && length && public != undefined){
        post_boats(owner,name, type, length, public)
        .then(key => { 
            res.type('application/json');
            
            res.status(201).send({ "id": key.id, "name":name, "type":type,"length":length, "public":public, "owner":owner
    
        })
    });
    }else {
        res.status(400).json({'Error': 'The request object is missing at least one of the required attributes'});
    }
    
        
});

//List boats depends on status
router.get('/', function (req, res) {  
    //invalid jwt, return all public boats
    if(req.errorStatus === 'UnauthorizedError'){
        let owner = null;
        const results = get_boats(owner)
        .then((results) => {
            res.status(200).json(results);
        });
        return
    }

    //valid jwt, return all boats by owner
    let owner = req.user.sub;
 
    const results = get_boats(owner)
        .then((results) => {
            res.status(200).json(results);
        });
});

//Delete a boat
router.delete('/:id', function (req, res) {
    if(req.errorStatus === 'UnauthorizedError'){   
        res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
        return
    }
 
    delete_boat(req.params.id, req.user.sub)
        .then(boat => {
            if (boat === undefined || boat === null) {
                // The 0th element is undefined. This means there is no boat with this id
                res.status(403).json({ 'Error': 'No boat with this boat_id exists' });
            } else if (boat === 403){
                res.status(403).json({ 'Error': 'This boat is not yours' });
                
            }else{
                // Return 204 No Content
                res.status(204).end();
            }
        });
});

module.exports = router