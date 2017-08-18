const express = require('express');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const app = express();

const compiler = webpack(webpackConfig);

var bcrypt = require('bcrypt');
const saltRounds = 10;

// Open SQLite database.
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('sf.db');
// Create tables if don't exist already.
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT,
  passwordhash TEXT,
  salt TEXT)`);

// Host static webpages
app.use(express.static(__dirname + '/www', {
  extensions: ['html'] // so "/submit" works as well as "/submit.html"
}));

// Configure body-parser for POST parameters
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Submit game endpoint
// POST /submitgame
// Params: gamename, gamelink
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

// Register endpoint
// POST /register
// Params: email, password
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
  db.get('SELECT 1 FROM users WHERE email = ($email)',
    {'$email':email},
    function(err, row){
      if (err) {
        console.log('SQLite error:');
        console.log(err);
        res.status(500).send({Message: 'Database error.'});
        return;
      }
      // row is {'1':1} if found, or undefined if not found
      if (row) {
        res.status(400).send({Message: 'Email already in use.'});
        return;
      }

      // TODO: send verification email instead of just adding user.

      // Add user to the database.
      var salt = bcrypt.genSaltSync(saltRounds);
      var hash = bcrypt.hashSync(password, salt);

      db.run('INSERT INTO users (email, passwordhash, salt) VALUES ($email, $hash, $salt)', 
        {'$email':email, '$hash':hash, '$salt':salt},
        function(err){
          if (err) {
            console.log('SQLite error:');
            console.log(err);
            res.status(500).send({Message: 'Database error.'});
          } else {
            res.status(200).send({Message: 'User added to DB.'});
          }
      });
  });
});

// Verify email endpoint
// GET /verify/[token]
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
