const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat";

router.use(bodyParser.json());



async function get_boats(owner_id) {
    
    //return all public boats by owner    
    const query = datastore.createQuery(BOAT).filter('owner','=', owner_id).filter('public','=',true);
    let boats = await datastore.runQuery(query);
    if (!boats[0]){return []}
    return boats[0].map(ds.fromDatastore);
    
}

  /* ------------- Begin Controller Functions ------------- */
//List boats depends on status
router.get('/:owner_id/boats', function (req, res) {  
    
    const results = get_boats(req.params.owner_id)
        .then((results) => {
            res.status(200).json(results);
        });
});

module.exports = router