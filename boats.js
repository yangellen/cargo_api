const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat";
const LOAD = "Load";

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

//check for valid number and type of attribute for patch
function valid_attribute_patch(array){
    //need at least 1 but no more than 3
    if (array.length < 1 || array.length > 3){
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

    //loop table to check each attribute appear no more than once
    let count = 0;

    for (let att of Object.keys(attributes)){
        if (attributes[att] > 1){
            return false
        }
        else if (attributes[att] === 1){
            count += 1;
        }
    }

    if (count < 1){
        return false
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

async function patch_boat(id, name, type, length, owner) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);

    let boats = await datastore.get(key);
    let boat = boats[0];

    //check for valid id 
    if (boat === undefined || boat === null){
        return null
    }

    //check for valid owner
    if (boat.owner != owner){
        return 403
    }

    boat.name = name || boat.name;
    boat.type = type || boat.type;
    boat.length = length || boat.length;
    boat.loads = boat.loads;
    boat.owner = boat.owner;

    await datastore.save({ "key": key, "data": boat });

    return boat;
    
}


/**
 * The function datastore.query returns an array, where the element at index 0
 * is itself an array. Each element in the array at element 0 is a JSON object
 * with an entity fromt the type "boat".
 * Display 5 boats per page
 */
 async function get_boats(req) {
    let owner = req.user.sub;
    let totalQuery = datastore.createQuery(BOAT).filter('owner','=', owner);
    let query = datastore.createQuery(BOAT).filter('owner','=', owner).limit(5);

    let results = {};
    if(req.query && req.query.cursor){
        query = query.start(req.query.cursor);
    }

    let totalBoats = await datastore.runQuery(totalQuery);
    let boats = await datastore.runQuery(query);

    results.items = boats[0].map(ds.fromDatastore);
    results.total_boats = totalBoats[0].length;

    if (boats[1].moreResults != ds.Datastore.NO_MORE_RESULTS){
        results.next = req.protocol+"://"+req.get("host")+req.baseUrl+"?cursor="+boats[1].endCursor;
    }
    
    return results
    
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

async function put_load_on_boat(load_id, boat_id,owner){
    const boat_key = datastore.key([BOAT, parseInt(boat_id, 10)]);
    const load_key = datastore.key([LOAD, parseInt(load_id, 10)]);

    //check if boat exist
    let boats = await datastore.get(boat_key);
    if (boats[0] === undefined || boats[0] === null){
        return 404; 
    }

    //check if load exist
    let loads = await datastore.get(load_key);
    if(loads[0] === undefined || loads[0] === null){
        return 404;
    }

    //check for valid owner
    if (boats[0].owner != owner){
        return 403
    }

    //check if load already has carrier
    if (loads[0].carrier.id){
        return 403;
    }else{
        //assign carrier to load
        loads[0].carrier = {
            id: boat_id,
            name: boats[0].name
        };

        //place load on boat
        boats[0].loads.push({id: load_id});

        //save updated load to ds
        await datastore.save({
            "key": load_key,
            "data": loads[0]
        })

        //save updated boat to ds
        await datastore.save({
            "key": boat_key,
            "data": boats[0]
        })

        return 204;
    }

}

async function delete_load_from_boat(load_id, boat_id){
    const boat_key = datastore.key([BOAT, parseInt(boat_id, 10)]);
    const load_key = datastore.key([LOAD, parseInt(load_id, 10)]);

    //check if boat exist
    let boats = await datastore.get(boat_key);
    if (boats[0] === undefined || boats[0] === null){
        return 404; 
    }

    //check if load exist
    let loads = await datastore.get(load_key);
    if(loads[0] === undefined || loads[0] === null){
        return 404;
    }

    //check if boat is the carrier of this load
    if (loads[0].carrier.id != boat_id){
        return 404;
    }else{
        //set the carrier of load to {}
        loads[0].carrier = {};

        //remove load from boat.loads
        let new_load = boats[0].loads.filter(
            boat_load => boat_load.id != load_id
          );
        
        boats[0].loads = new_load;
        
        await datastore.save({
            "key": load_key,
            "data": loads[0]
        });

        await datastore.save({
            "key": boat_key,
            "data": boats[0]
        });

        return 204;
    }

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

//List all boats 
router.get('/', async function (req, res) {
    if(req.errorStatus === 'UnauthorizedError'){      
        res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
        return
    }

    //check accept types
    if (!req.accepts(['application/json'])){
        res.status(406).json({'Error': 'The requested content type is not available'});
        return
    }

    let results = await get_boats(req);
    let boats = results.items;

    for (let i = 0; i < boats.length; i++){
        boats[i].self = url.format({
            protocol:req.protocol,
            hostname: req.get('host'),
            pathname: req.baseUrl + '/' + boats[i].id
        });

        //add self to array of loads
        for(let i = 0; i < boats[i].loads.length; i++){
            let load = boats[i].loads[i];
            load.self = url.format({
                protocol:req.protocol,
                hostname: req.get('host'),
                pathname: 'loads/' +load.id
            });
        }
    }
    res.status(200).json(results);
        
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
    
    /* create new boats */ 
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

                //add self to array of loads
                for(let i = 0; i < boat[0].loads.length; i++){
                    let load = boat[0].loads[i];
                    load.self = url.format({
                        protocol:req.protocol,
                        hostname: req.get('host'),
                        pathname: 'loads/' +load.id
                    });
                }
               
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

//Edit a boat with PATCH, updated only modified attribute and other remain the same
router.patch('/:id', function (req, res) {
    if(req.errorStatus === 'UnauthorizedError'){      
        res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
        return
    }

    let id = req.params.id;
    let name = req.body.name;
    let type = req.body.type;
    let length = req.body.length;
    let owner = req.user.sub

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
    if (!valid_attribute_patch(attArray)){
        res.status(400).json({'Error': 'The request JSON contain attribute that is not name, type, length or contain no required attributes'});
            return
    }

    //check name
    if (name){
        if (!valid_boat_name(name)){
            res.status(400).json({'Error': 'Name can only have letters, numbers, dash and space with at least one character but no more than 128'});
            return
        }
    }
    
    //check length
    if (length){
        if (!valid_boat_length(length)){
            res.status(400).json({'Error': 'The length of boat must be at least 16 feet but no more than 450 feet'});
            return
        }
    }
    
    //check type
    if (type){
        if (!valid_boat_name(type)){
            res.status(400).json({'Error': 'Type can only have letters, numbers, dash and space with at least one character but no more than 128'});
            return
        }

    }
    
    patch_boat(id, name, type, length, owner)
    .then(key => { 
        if (key === 403){
            res.status(403).json({'Error': 'You are not the owner of the boat'});
        
        }else if (key === undefined || key === null) {
            
            res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
        }else{
            
            res.status(200).send({"id": id, "name":key.name, "type":key.type,"length":key.length,"owner":owner,"loads":key.loads,
            "self": url.format({
                protocol: req.protocol, 
                hostname: req.get('host'), 
                pathname: req.originalUrl})
                
            });
        }
    });
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

//Put a load to boat
router.put('/:boat_id/loads/:load_id', function(req,res){
    if(req.errorStatus === 'UnauthorizedError'){      
        res.status(401).json({'Error': 'Missing Jwt or invalid Jwt'});
        return
    }

    //check accept types
    if (!req.accepts(['application/json'])){
        res.status(406).json({'Error': 'The requested content type is not available'});
        return
    }

    let load_id = req.params.load_id;
    let boat_id = req.params.boat_id;

    put_load_on_boat(load_id, boat_id,req.user.sub)
        .then(result => {
        res.status(result);
        if (result === 403){
            res.json({"Error": "The carrier is not empty or you are not the owner of the boats" });
        }
        else if (result === 404){
            res.json({"Error": "The specified boat and/or load does not exist"});
        }
        else{
            res.end();
        }

     });

});

//Remove load from boat
router.delete('/:boat_id/loads/:load_id',function(req,res){
    let load_id = req.params.load_id;
    let boat_id = req.params.boat_id;

    delete_load_from_boat(load_id,boat_id)
    .then(result => {
        res.status(result);
        if (result === 404){
            res.send({"Error": "No load with this load_id is at the boat with this boat_id" });
        }else{
            res.end();
        }
     });

})

module.exports = router