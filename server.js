const express = require('express');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const app = express();

const compiler = webpack(webpackConfig);

var dao = require('./dao.js');
// Create tables if don't exist already.
dao.ensureTablesCreated()

var bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
var fs = require('fs');

// Load config.
var content = JSON.parse(fs.readFileSync('config/config.json'));
if (!content.jwt_secret) {
  console.log('jwt_secret not defined in config');
  return
}
const jwt_secret = content.jwt_secret;

// Host static webpages
app.use(express.static(__dirname + '/www', {
  extensions: ['html'] // so "/submit" works as well as "/submit.html"
}));

// Configure body-parser for POST parameters
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Submit game endpoint.
// Params: gamename, gamelink
// Successful response: {}
app.post('/submitgame', function(req, res){
  var gamename = req.body.gamename
  var gamelink = req.body.gamelink

  if (!gamename) {
    res.status(400).send({Message: "Game name cannot be empty."})
    return

  } else if (!gamelink) {
    res.status(400).send({Message: "Game link cannot be empty."})
    return
  }

  // TODO: store the submitted game info somewhere
  // also possibly 400 if game name (link?) is already in the list

  res.status(200).send({Message: "Success!"})
});

// Register endpoint.
// Params: email, password
// Successful response: {Email, Token}
app.post('/register', function(req, res){
  // Sanitize input.
  var email = req.body.email;
  var password = req.body.password;
  if (!email) {
    res.status(400).send({Message: 'Email cannot be empty.'});
    return;

  // TODO: password strength check
  } else if (!password) {
    res.status(400).send({Message: 'Password cannot be empty.'});
    return;
  }

  // Check if email is already in use.
  dao.getUserByEmail(email,
    function(err, row){
      if (err) {
        console.log('SQLite error:');
        console.log(err);
        res.status(500).send({Message: 'Database error.'});
        return;
      }
      if (row) {
        res.status(400).send({Message: 'Email already in use.'});
        return;
      }

      // TODO: send verification email instead of just adding user.

      // Add user to the database.
      var salt = bcrypt.genSaltSync(saltRounds);
      var hash = bcrypt.hashSync(password, salt);
      dao.insertUser(email, hash, salt,
        function(err){
          if (err) {
            console.log('SQLite error:');
            console.log(err);
            res.status(500).send({Message: 'Database error.'});
          } else {
            var id = this.lastID; // set by sqlite3
            var token = generateToken({email:'email', 'id':id});
            res.status(200).send({Email: email, Token: token});
          }
      });
  });
});

// Login endpoint.
// Params: email, password
// Successful response: {Email, Token}
app.post('/login', function(req, res){
  var email = req.body.email;
  var password = req.body.password;
  dao.getUserByEmail(email, function(err, row){
    // TODO: check: does throwing here work?
    if (err) {
      throw err
    }
    var valid = bcrypt.compareSync(password, row.passwordhash);
    if (valid) {
      var token = generateToken(row);
      res.status(200).send({Email: email, Token: token});
    } else {
      res.status(401).send({Message: 'Unauthorized.'});
    }
  });
});

function generateToken(user) {
  var u = {
    email: user.email,
    id: user.id.toString()
  };

  return token = jwt.sign(u, jwt_secret, {
    expiresIn: 60 * 60 * 24 // 24 hours
  });
}

// Verify email endpoint.
app.get('/verify/:token', function(req, res){
  var token = req.params.token;
  // TODO: verify token and activate account
  res.status(501).send({Message: 'Email verification not yet implemented.'});
});

// Hook up webpack middleware
app.use(webpackDevMiddleware(compiler, {
  hot: true,
  filename: 'bundle.js',
  publicPath: '/',
  stats: {
    colors: true,
  },
  historyApiFallback: true,
}));

// Start the server
const server = app.listen(3000, function() {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
