const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const LOAD = "Load";
const BOAT = "Boat";

router.use(bodyParser.json());

const url = require('url');

/* ------------- Begin Load Model Functions ------------- */
function post_load(volume, carrier, content, creation_date) {
    var key = datastore.key(LOAD);
    const new_load = { "volume": volume, "carrier": carrier, "content": content, "creation_date": creation_date};
    return datastore.save({ "key": key, "data": new_load }).then(() => { return key });
}

//Get 5 loads per page
async function get_loads(req) {
    let totalQuery = datastore.createQuery(LOAD);
    let query = datastore.createQuery(LOAD).limit(5);

    let results = {};
    if(req.query && req.query.cursor){
        query = query.start(req.query.cursor);
    }

    let total_loads = await datastore.runQuery(totalQuery);
    let loads = await datastore.runQuery(query);

    results.items = loads[0].map(ds.fromDatastore);
    results.total_loads = total_loads[0].length;

    if (loads[1].moreResults != ds.Datastore.NO_MORE_RESULTS){
        results.next = req.protocol+"://"+req.get("host")+req.baseUrl+"?cursor="+loads[1].endCursor;
    }
    
    return results
}

//get a load
function get_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(ds.fromDatastore);
        }
    });
}

async function delete_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    const entity = await datastore.get(key);
    if (entity[0] === undefined || entity[0] === null) {
        return entity;
    } else {
        //check to see if carrier, if so remove load from boat
        if (entity[0].carrier.length != 0) {
            const boatKey = datastore.key([BOAT, parseInt(entity[0].carrier.id, 10)]);
            let boats = await datastore.get(boatKey);
            let boat = boats[0];
            let new_load = boat.loads.filter(boat_load => boat_load.id != id);
            boat.loads = new_load;

            await datastore.save({
                "key": boatKey,
                "data": boat
            });
        }
        return datastore.delete(key);
    }
    
}


/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */
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

//List all loads with pagination
router.get('/', function (req, res) {

     //check accept types
     if (!req.accepts(['application/json'])){
        res.status(406).json({'Error': 'The requested content type is not available'});
        return
    }

    const boats = get_loads(req)
        .then((loads) => {
            for(let i = 0; i < loads.length; i++){
                loads[i].self = url.format({
                    protocol: req.protocol,
                    hostname: req.get('host'),
                    pathname: req.baseUrl + '/' + loads[i].id
                });

                //add self to carrier
                if (loads[i].carrier){
                    loads[i].carrier.self = url.format({
                        protocol: req.protocol,
                        hostname: req.get('host'),
                        pathname: '/loads/' + loads[i].carrier.id
                    });
                }
            }
            res.status(200).json(loads);
        });
});

//Create a load
router.post('/', function (req, res) {

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

    let volume = req.body.volume;
    let carrier = {};
    let content = req.body.content;
    let creation_date = req.body.creation_date;

    /* Request need to have all three attributes */
    if (volume && content && creation_date != undefined){
        post_load(volume, carrier, content, creation_date)
        .then(key => { res.status(201).send({
             "id":key.id, 
             "volume": volume,
             "carrier" : carrier,
             "content": content,
             "creation_date": creation_date,
             "self": url.format({
                 protocol: req.protocol,
                 hostname: req.get('host'),
                 pathname: req.baseUrl + '/' + key.id
             })
        }) 
    });
    }else {
        res.status(400).json({'Error': 'The request object is missing at least one of the required attributes'});
    }
    
});

//delete a load
router.delete('/:id', function (req, res) {
    delete_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                // The 0th element is undefined. This means there is no boat with this id
                res.status(404).json({ 'Error': 'No load with this load_id exists' });
            } else {
                // Return 204 No Content
                res.status(204).end();
            }
        });
});

//Get a single load
router.get('/:id', function (req, res) {

    //check accept types
    if (!req.accepts(['application/json'])){
        res.status(406).json({'Error': 'The requested content type is not available'});
        return
    }

    get_load(req.params.id)
        .then(load => {
            if (load[0] === undefined || load[0] === null) {
                // The 0th element is undefined. This means there is no boat with this id
                res.status(404).json({ 'Error': 'No load with this load_id exists' });
            } else {
                // Return the 0th element which is the load with this id
                load[0].self = url.format({
                    protocol:req.protocol,
                    hostname: req.get("host"),
                    pathname: req.originalUrl
                });

                // add url to carrier
                if (load[0].carrier.id){
                    load[0].carrier.self = url.format({
                        protocol: req.protocol,
                        hostname: req.get("host"),
                        pathname: '/boats/'+ load[0].carrier.id
                    });
                }

                res.status(200).json(load[0]);
            }
        });
});

module.exports = router