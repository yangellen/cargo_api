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

const DOMAIN = 'cargo-api.us.auth0.com';

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
function post_boats(owner,name, type, length,loads) {
    var key = datastore.key(BOAT);
    const new_boat = { "owner": owner,"name": name, "type": type, "length": length,"loads":loads};
    return datastore.save({ "key": key, "data": new_boat }).then(() => { return key });
}

//check for valid name of boat or type
function valid_boat_name(name){
    //make sure is string
    if (typeof name != 'string'){
        return false
    }
    //check length
    if (name.length < 1 || name.length > 128){
        return false
    }

    //only allows letters, numbers, dash and space
    validChar = /^[0-9A-Za-z\s\-]+$/;
    if (!name.match(validChar)){
        return false
    } 
    
    return true   
}

//check for valid length of boat
function valid_boat_length(size){
    //make sure is a number
    if (typeof size != 'number'){
        return false
    }
    //check valid range, min 16 feet, max 450 feet
    if (size < 16 || size > 450){
        return false
    }
    
    return true   
}

//check for valid number and type of attribute for put
function valid_attribute_put(array){
    //need to be 3
    if (array.length != 3){
        return false
    }

    //check correct attribute
    const attributes = {"name":0,"type":0,"length":0}
    
    //check to see if attribute is name, type, or length
    for (let att of array){
        if (attributes.hasOwnProperty(att)){
            attributes[att] += 1;

        }else{
            return false
        }
    }

    //loop table to check each attribute appear once
    for (let att of Object.keys(attributes)){
        if (attributes[att] != 1){
            return false
        }
    }

    return true
 
}

/**
 Get a boat with valid id and owner
 */
function get_boat(id, owner) {
    
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    return datastore.get(key).then((boat) => {
        if (boat[0] === undefined || boat[0] === null) {
            // No entity found. Don't try to add the id attribute
            return 404;
        } else {
            boat.map(ds.fromDatastore);
            //check if the boat belong to owner
            if (boat[0].owner != owner){
                return 403
            }
            return boat
        }
    });
}

//modified all attribute of boat except id, owner and loads with put
async function put_boat(id, name, type, length,owner) {
    
    const key = datastore.key([BOAT, parseInt(id, 10)]);
    let boats = await datastore.get(key);
    let boat = boats[0];

    //chack valid id
    if (boat === undefined || boat === null){
        return null
    }

    //check if valid owner
    if (boat.owner != owner){
        return 403
    }

    boat.name = name;
    boat.type = type;
    boat.length = length;
    boat.loads = boat.loads;
    boat.owner = boat.owner;
    
    await datastore.save({"key":key, "data":boat});

    return boat

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

// Add a boat, a new boat starts with empty load
router.post('/',function (req, res) {
    if(req.errorStatus === 'UnauthorizedError'){      
      res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
      return
    }

    let owner = req.user.sub;
    let name = req.body.name;
    let type = req.body.type;
    let length = req.body.length;
    let loads = [];

     //check request type
     if(req.get('content-type') != 'application/json'){
        res.status(415).json({'Error': 'The server only accepts application/json'});
        return
    }

    //check accept types
    if (!req.accepts(['application/json'])){
        res.status(406).json({'Error': 'The requested content type is not available'});
        return
    }

     //check for valid attributes
     let attArray = Object.keys(req.body);
     if (!valid_attribute_put(attArray)){
         res.status(400).json({'Error': 'The request JSON contain attribute that is not name, type, length or missing at least one of the required attributes'});
             return
     }
 
     //check name
     if (!valid_boat_name(name)){
         res.status(400).json({'Error': 'Name can only have letters, numbers, dash and space with at least one character but no more than 128'});
         return
     }
     //check length
     if (!valid_boat_length(length)){
         res.status(400).json({'Error': 'The length of boat must be at least 16 feet but no more than 450 feet'});
         return
     }
     //check type
     if (!valid_boat_name(type)){
         res.status(400).json({'Error': 'Type can only have letters, numbers, dash and space with at least one character but no more than 128'});
         return
     }
    
    /* crate new boats */ 
    post_boats(owner,name, type, length,loads)
    .then(key => { 
        res.type('application/json');
        
        res.status(201).send({ "id": key.id, "name":name, "type":type,"length":length, "owner":owner,"loads":loads,
        "self": url.format({
            protocol: req.protocol, 
            hostname: req.get("host"), 
            pathname: req.baseUrl + '/' + key.id,})
    })
});
    
        
});

/**
 Get a single boat
 */
 router.get('/:id', function (req, res) {
    if(req.errorStatus === 'UnauthorizedError'){      
        res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
        return
      }

    //check accept types
    if (!req.accepts(['application/json'])){
        res.status(406).json({'Error': 'The requested content type is not available'});
        return
    }
    
    get_boat(req.params.id, req.user.sub)
        .then(boat => {
            if (boat === 404) {
                res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
            } else if (boat === 403){
                res.status(403).json({ 'Error': 'You are not the owner of the boat' });
            }else {
                // Return the 0th element which is the boat with this id
                boat[0].self = url.format({
                    protocol:req.protocol,
                    hostname: req.get("host"),
                    pathname: req.originalUrl
                });
               
                res.status(200).json(boat[0]);
                
            }
        });
});


//Edit a boat with PUT, all attributes must be included
router.put('/:id', function (req, res) {
    if(req.errorStatus === 'UnauthorizedError'){      
        res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
        return
    }

    let id = req.params.id;
    let name = req.body.name;
    let type = req.body.type;
    let length = req.body.length;
    let owner = req.user.sub;

     //check request type
     if(req.get('content-type') != 'application/json'){
        res.status(415).json({'Error': 'The server only accepts application/json'});
        return
    }

    //check accept types
    if (!req.accepts(['application/json'])){
        res.status(406).json({'Error': 'The requested content type is not available'});
        return
    }

    //check for valid attributes
    let attArray = Object.keys(req.body);
    if (!valid_attribute_put(attArray)){
        res.status(400).json({'Error': 'The request JSON contain attribute that is not name, type, length or missing at least one of the required attributes'});
            return
    }

    //check name
    if (!valid_boat_name(name)){
        res.status(400).json({'Error': 'Name can only have letters, numbers, dash and space with at least one character but no more than 128'});
        return
    }
    //check length
    if (!valid_boat_length(length)){
        res.status(400).json({'Error': 'The length of boat must be at least 16 feet but no more than 450 feet'});
        return
    }
    //check type
    if (!valid_boat_name(type)){
        res.status(400).json({'Error': 'Type can only have letters, numbers, dash and space with at least one character but no more than 128'});
        return
    }

   
    put_boat(id, name, type, length, owner)
    .then(key => { 
        if (key === 403){
            res.status(403).json({'Error': 'You are not the owner of the boat'});
        
        }else if (key === null) {
            
            res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
        }else{
            res.status(200).send({"id": id, "name":name, "type":type,"length":length, "owner":owner, "loads":key.loads,
            "self": url.format({
                protocol: req.protocol, 
                hostname: req.get('host'), 
                pathname: req.originalUrl})
                
            });
        }
    });
})

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