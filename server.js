const express = require('express');
const path = require('path');
const app = express();

var userInViews = require('./lib/middleware/userInViews');
var authRouter = require('./auth');
var indexRouter = require('./index');
var usersRouter = require('./users');
//
app.set('trust proxy', true);

var session = require('express-session');

//config express-session
var sess = {
    secret: 'for final secret',
    cookie:{},
    resave: false,
    saveUninitialized: true
};

if (app.get('env') === 'production'){
    sess.cookie.secure = true;
}

app.use(session(sess));

//load environment variables from .env
var dotenv = require('dotenv');
dotenv.config();

//Load passport
var passport = require('passport');
var Auth0Strategy = require('passport-auth0');

//configure passport to use Autho0
var strategy = new Auth0Strategy(
    {
      domain: process.env.AUTH0_DOMAIN,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      callbackURL:
        process.env.AUTH0_CALLBACK_URL || 'http://localhost:8080/callback'
    },
    function (accessToken, refreshToken, extraParams, profile, done) {
      // accessToken is the token to call Auth0 API (not needed in the most cases)
      // extraParams.id_token has the JSON Web Token
      // profile has all the information from the user
      return done(null, extraParams.id_token);
    }
  );
  
passport.use(strategy);

app.use(passport.initialize());
app.use(passport.session());

  

// You can use this section to keep a smaller payload
passport.serializeUser(function (user, done) {
    done(null, user);
  });
  
passport.deserializeUser(function (user, done) {
done(null, user);
});

//view engine setup
app.set('views',path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//
app.use(userInViews());
app.use('/', authRouter);
app.use('/', indexRouter);
app.use('/', usersRouter);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});
