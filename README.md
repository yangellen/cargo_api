# cargo_api
**https://yange-cargo-api.wm.r.appspot.com**
**Cargo_Api** is RESTFul cargo management API built by using Node.js. 
Datastore is used to store data and the project is deploy with Google App Engine.

## 
* [x] Users can create new accounts.
* [x] Users can login, and is shown a JWT and their user id.
* [x] An endpoint is provided to show the collection of all users.
* [x] All non-users entities (Boats, Loads) have a root URL that returns the collection of that entity
* [x] The collection for an unprotedted entity (Loads) must show all the entites in the collection.
* [x] The collection for a protected entity (Boats) must show only the entites corresponding to the JWT.
* [x] All root non-users entity collections implement paging of 5 items at a time.
* [x] All non-users entities (Boats, Loads) have a self link that points to the most canonical representation of that entity instance.
* [x] All non-users entities (Boats, Loads) support at least 3 properties in addition to any properties modeling relationships, or the id and self property
* [x] Every non-users (Boats, Loads) entity supports create, read, update (PUT, PATCH), delete operation. The endpoint must be protected for a protected entity (Boats).
* [x] An protected endpoint for user to assign Load to a Boat.
* [x] An protected endpoint for user to remove a Load from Boat.
* [x] 200, 201, 204, 401, 403, 405, 406 status codes are supported.
* [x] Postman test collection used to test the cargo api.



