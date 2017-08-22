const express = require('express');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const app = express();
const compiler = webpack(webpackConfig);

// Hook up webpack middleware.
app.use(webpackDevMiddleware(compiler, {
  hot: true,
  filename: 'bundle.js',
  publicPath: '/',
  stats: {
    colors: true,
  },
  historyApiFallback: true,
}));

// Configure body-parser for POST parameters.
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Various requires.
var bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
var fs = require('fs');
const uuidv4 = require('uuid/v4'); // Version 4 is Random
const mail = require('./mail.js');
const webhooks = require('./webhooks.js');
const { URL } = require('url');

var dao = require('./dao.js');
// Create tables if don't exist already.
dao.ensureTablesCreated()

// Parse DoT template files.
var dots = require('dot').process({path: './dot_views'});

// Load config.
const configPath = 'config/config.json';
if (!fs.existsSync(configPath)) {
  console.log(configPath+' does not exist.');
  return;
}
var config = JSON.parse(fs.readFileSync(configPath));
if (!config.jwt_secret) {
  console.log('jwt_secret not defined in config.');
  return;
}
if (!config.port) {
  console.log('port not defined in config.');
  return;
}

// Host static webpages
app.use(express.static(__dirname + '/www', {
  extensions: ['html'] // so "/submit" works as well as "/submit.html"
}));

app.get('/list/:order',function(req,res){
  var daoFunc;
  var otherSortLink;
  if (req.params.order == 'new') {
    daoFunc = dao.getPublicListGamesNewest;
    otherSortLink = '<a href="/list/alpha">Sort alphabetically</a>';
  } else if (req.params.order == 'alpha') {
    daoFunc = dao.getPublicListGamesAlphabetical;
    otherSortLink = '<a href="/list/new">Sort by release date</a>';
  } else {
    res.status(400).send({Message:'Supported orderings are /list/new and /list/alpha.'});
    return;
  }

  daoFunc(function(err,games){
    if (err) {
      console.log(err);
      res.status(500).send({Message:"Database error."});
    } else {
      res.status(200).send(dots.fulllist({"games":games,"other_sort_link":otherSortLink}));
    }
  });
});

app.get('/list',function(req,res){
  res.redirect('/list/new');
});

app.get('/games',function(req,res){
  dao.getGames(req.query.mindate,function(err,games){
    if (err) {
      console.log(err)
      res.status(500).send({Message:"Database error."});
    } else {
      res.status(200).send(games);
    }
  });
});

// Submit game endpoint.
// Params: gamename, gamelink
// Successful response: {}
app.post('/submitgame', function(req, res){
  var gamename = req.body.gamename
  var gamelink = req.body.gamelink
  var token = req.header('Authorization');

  if (!gamename) {
    res.status(400).send({Message: "Game name cannot be empty."})
    return

  } else if (!gamelink) {
    res.status(400).send({Message: "Game link cannot be empty."})
    return

  } else if (!token) {
    res.status(400).send({Message: "Must set Authorization header."})
    return
  }

  try {
    new URL(gamelink);
  }catch(e){
    res.status(400).send({Message: `Invalid URL: ${gamelink}.`});
    return;
  }

  token = token.replace('Bearer ', '');
  jwt.verify(token, config.jwt_secret, function(err, user) {
    if (err) {
      res.status(401).send({Message: 'Unauthorized.'});
    } else {
      dao.insertGame(user.id, gamename, gamelink, function(err){
        if (err) {
          console.log('SQLite error:');
          console.log(err);
          res.status(500).send({Message: 'Database error.'});
          return;
        }
        console.log(`User ${user.email} submitted game ${gamename} link ${gamelink}`);
        webhooks.sendGameSubmitted(user.email, gamename, '[authors TODO]', gamelink);
        res.status(200).send({Message: "Success!"})
        // TODO: store the submitted game info somewhere
        // also possibly 400 if game name (link?) is already in the list
      });
    }      
  });
});

// Register endpoint.
// Params: email, password
// Successful response: {}
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
  dao.getUserByEmail(email, function(err, row){
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

    var verifyHash = uuidv4();
    var verifyUrl = req.headers.host+'/verify/'+verifyHash;

    // Add user to the database.
    var hash = bcrypt.hashSync(password, saltRounds);
    dao.insertUser(email, hash, verifyHash, function(err){
      if (err) {
        console.log('SQLite error:');
        console.log(err);
        res.status(500).send({Message: 'Database error.'});
        return;
      }

      // Send verification email.
      mail.sendAccountVerificationMail(email, verifyUrl, function(error, info) {
        if (error) {
          console.log(error);
          res.status(500).send({Message: 'Failed to send email.'});
        } else {
          console.log('Email sent: ' + info.response);
          res.status(200).send({Message: 'Sent verification email. Please click the link in it.'});
        }
      });
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
    if (err) {
      console.log(err);
      res.status(500).send({Message: 'Database error.'});
    }
    if (!row) {
      res.status(401).send({Message: 'Unauthorized.'});
      return;
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
  };

  return token = jwt.sign(u, config.jwt_secret, {
    expiresIn: 60 * 60 * 24 // 24 hours
  });
}

// Verify email endpoint.
// Successful response: Webpage
app.get('/verify/:token', function(req, res){
  var token = req.params.token;
  if (!token) {
    res.status(400).send({Message: 'Must provide token in url.'});
  }
  dao.verifyUser(token, function(err, lastID) {
    if (err) {
      console.log(err);
      res.status(400).send({Message: 'Database error.'});
    } else {
      dao.getUserById(lastID, function(err, row) {
        if (err) {
          console.log(err);
          res.status(400).send({Message: 'Database error.'});
        } else {
          var token = generateToken(row);
          res.status(200).send(dots.verified({token: token}));
        }
      });
    }
  });
});

// Start the server
const server = app.listen(config.port, function() {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
