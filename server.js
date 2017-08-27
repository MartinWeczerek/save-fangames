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
  throw(configPath+' does not exist.');
}
var config = JSON.parse(fs.readFileSync(configPath));
if (!config.jwt_secret) {
  throw('jwt_secret not defined in config.');
}
if (!config.port) {
  throw('port not defined in config.');
}
if (!config.root_url) {
  throw('root_url not defined in config.');
}
if (!config.approval_check_schedule) {
  throw('approval_check_schedule not defined in config.');
}

// Schedule periodic tasks.
const schedule = require('node-schedule');
schedule.scheduleJob(config.approval_check_schedule,function(){
  dao.approveMaturedGames(function(err,games){
    if (err) {
      console.log(err);
      return;
    }
    if (games.length > 0) {
      console.log(`${games.length} games approved`);
      webhooks.sendGamesApproved(games);
    }
  });
});

// Host static content.
app.use(express.static(__dirname + '/www', {
  extensions: ['html'] // so "/submit" works as well as "/submit.html"
}));

app.get('/',function(req,res){
  res.status(200).send(dots.base({
    content:'<p>Welcome to fangame submission site!</p>',
    navSelector:'.navHome'}));
});

app.get('/admin',function(req,res){
  res.status(200).send(dots.base({
    content:'<div id="adminroot"></div>',
    navSelector:'.navAdmin'}));
});

app.get('/submit',function(req,res){
  res.status(200).send(dots.base({
    content:'<div id="myprofileroot"></div><div id="submitroot">Enable JavaScript to log in and view this page.</div>',
    navSelector:'.nothing'}));
});

function verifyAuth(req,res,adminonly,callback){
  var token = req.header('Authorization');
  if (!token) {
    res.status(400).send({Message: "Must set Authorization header."});
    return;
  }
  token = token.replace('Bearer ', '');

  jwt.verify(token, config.jwt_secret, function(err, user) {
    if (err) {
      res.status(401).send({Message: 'Unauthorized.'});
    } else if (adminonly && !user.admin) {
      res.status(401).send({Message: 'Unauthorized.'});
    } else {
      dao.getUserById(user.id,function(err,user){
        if (user.banned) {
          res.status(401).send({Message: 'Unauthorized. You have been banned.'});
        } else {
          callback(user);
        }
      });
    }
  });
}

app.post('/admin',function(req,res){
  verifyAuth(req,res,true,function(user){
    dao.getReports(req.body.type,req.body.order,req.body.answered,
      function(err,reports){
        if (err) {
          console.log(err);
          res.status(500).send({Message:"Database error."});
        } else {
          res.status(200).send(reports);
        }
      });
  });
});

app.post('/admin/rejectgame',function(req,res){
  verifyAuth(req,res,true,function(user){
    dao.rejectGame(req.body.gameid,user,function(err){
        if (err) {
          console.log(err);
          res.status(500).send({Message:"Database error."});
        } else {
          res.status(200).send();
        }
      });
  });
});

app.post('/admin/banuser',function(req,res){
  verifyAuth(req,res,true,function(user){
    dao.banUser(req.body.userid,user,function(err){
        if (err) {
          console.log(err);
          res.status(500).send({Message:"Database error."});
        } else {
          res.status(200).send();
        }
      });
  });
});

app.post('/myprofile',function(req,res){
  verifyAuth(req,res,false,function(user){
    dao.getGamesByUser(user.id,function(err,games){
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        if (games.length == 0) {
          games = [{name:"No games submitted yet!"}];
        }
        res.status(200).send(dots.mygames({"games":games}));
      }
    });
  });
});

app.get('/list/:order',function(req,res){
  var daoFunc;
  var toplinks;
  if (req.params.order == 'new') {
    daoFunc = dao.getPublicListGamesNewest;
    toplinks = '<a href="/list/alpha">Alphabetical</a> | Date';
  } else if (req.params.order == 'alpha') {
    daoFunc = dao.getPublicListGamesAlphabetical;
    toplinks = 'Alphabetical | <a href="/list/new">Date</a>';
  } else {
    res.status(400).send({Message:'Supported orderings are /list/new and /list/alpha.'});
    return;
  }

  daoFunc(function(err,games){
    if (err) {
      console.log(err);
      res.status(500).send({Message:"Database error."});
    } else {
      var content = dots.fulllist({games:games,
        toplinks:toplinks})
      res.status(200).send(dots.base({content:content,
        navSelector:'.navList'}));
    }
  });
});

app.get('/list',function(req,res){
  res.redirect('/list/alpha');
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
  var gameauthors = req.body.gameauthors
  var token = req.header('Authorization');

  if (!gamename) {
    res.status(400).send({Message: "Game name cannot be empty."})
    return

  } else if (!gamelink) {
    res.status(400).send({Message: "Game link cannot be empty."})
    return

  } else if (!gameauthors) {
    res.status(400).send({Message: "Game authors cannot be empty."})
    return
  }

  try {
    new URL(gamelink);
  }catch(e){
    res.status(400).send({Message: `Invalid URL: ${gamelink}.`});
    return;
  }

  verifyAuth(req,res,false,function(user){
    dao.insertGame(user, gamename, gamelink, gameauthors, function(err){
      if (err) {
        console.log('SQLite error:');
        console.log(err);
        res.status(500).send({Message: 'Database error.'});
        return;
      }
      webhooks.sendGameSubmitted(user.email, gamename, gameauthors, gamelink);
      res.status(200).send({Message: "Success!"})
      // TODO: possibly 400 if game name (link?) is already in the list
    });
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
    var verifyUrl = config.root_url+'/verify/'+verifyHash;

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
      return;
    }
    if (!row) {
      res.status(401).send({Message: 'Unauthorized.'});
      return;
    }

    var valid = bcrypt.compareSync(password, row.passwordhash);
    if (valid) {
      if (row.banned) {
        res.status(401).send({Message: 'Unauthorized. You have been banned.'});
      } else {
        var token = generateToken(row);
        res.status(200).send({Email: email, Token: token});
      }
    } else {
      res.status(401).send({Message: 'Unauthorized.'});
    }
  });
});

function generateToken(user) {
  var u = {
    email: user.email,
    id: user.id,
    admin: user.admin,
  };

  return token = jwt.sign(u, config.jwt_secret, {
    expiresIn: 60 * 60 * 24 // 24 hours
  });
}

app.get('/verify/:token', function(req, res){
  var token = req.params.token;
  if (!token) {
    res.status(400).send({Message: 'Must provide token in url.'});
  }
  dao.verifyUser(token, function(err, user) {
    if (err) {
      console.log(err);
      res.status(400).send({Message: 'Database error.'});
    } else {
      var token = generateToken(user);
      res.status(200).send(dots.base({setToken: token,
        content:'<p>Success! Your account is now activated!</p>',
        navSelector:'.nothing'}));
    }
  });
});

// Start the server
const server = app.listen(config.port, function() {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
