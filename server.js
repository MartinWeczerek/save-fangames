const express = require('express');
const app = express();

// Hook up webpack dev middleware, which recompiles bundle.js on file changes.
/*const webpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const compiler = webpack(webpackConfig);
app.use(webpackDevMiddleware(compiler, {
  hot: true,
  filename: 'bundle.js',
  publicPath: '/',
  stats: {
    colors: true,
  },
  historyApiFallback: true,
}));*/

// Configure body-parser for POST parameters.
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

// Configure cookie-parser.
var cookieParser = require('cookie-parser');
app.use(cookieParser());

// Connect to DB and create tables if don't exist already.
var dao = require('./dao.js');
dao.ensureTablesCreated()

// Parse localized DoT templates.
var dots = require('dot').process({path: './loc_dot_views'});
function dotsloc(templatename, data, locale) {
  return dots[templatename+'_'+locale](data);
}

// Various requires.
var bcrypt = require('bcrypt');
const saltRounds = 10;
var jwt = require('jsonwebtoken');
const uuidv4 = require('uuid/v4'); // Version 4 is Random
const { URL } = require('url');
const moment = require('moment');
const mail = require('./mail.js');
const webhooks = require('./webhooks.js');

// Locale cookie midddleware
// Sets res.locals.locale, and sets Set-Cookie header if no locale cookie.
app.use(function (req,res,next){
  var locale = req.cookies.locale;
  if (!locale) {
    locale = req.acceptsLanguages('en', 'jp');
    if (!locale) {
       locale = 'en';
    }
    var expires = new Date(Date.now());
    expires.setFullYear(expires.getFullYear()+1);
    res.cookie('locale', locale, {expires:expires});
  }
  res.locals.locale = locale;
  next();
});

// Load config.
var fs = require('fs');
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
  var today = moment().utc().hour(0).minute(0).second(0).millisecond(0);
  var mindate = today.subtract(6, 'days').format('YYYY-MM-DD HH:mm:ss');
  dao.getGames(mindate,function(err,games){
    if (err) {
      console.log(err);
      res.status(500).send({Message:"Database error."});
    } else {
      // Group games into buckets by days.
      // [ {date:'01/01', games:[...]}, {date:'01/03', games:[...]}, ... ]
      games = games.sort(function(a,b){
        var aa = moment(a.approvedAt).valueOf();
        var bb = moment(b.approvedAt).valueOf();
        if (aa < bb) return -1;
        else if (aa == bb) return 0;
        else return 1;
      });

      var releases = [];
      var group = {};
      for (var i=0; i<games.length; i++) {
        var g = games[i];
        var m = moment(g.approvedAt, 'YYYY-MM-DD HH:mm:ss');
        var day = m.format('MM-DD');
        if (day != group.date) {
          group = {date:day, games:[]};
          releases.push(group);
        }
        group.games.push({name:g.name,link:g.link});
      }

      var content = dotsloc('homepage',{releases:releases},res.locals.locale);
      res.status(200).send(dotsloc('base',{
        content:content,
        navSelector:'.navHome'},res.locals.locale));
    }
  });
});

app.get('/admin',function(req,res){
  res.status(200).send(dotsloc('base',{
    content:'<div id="adminroot"></div>',
    navSelector:'.navAdmin'},res.locals.locale));
});

app.get('/submit',function(req,res){
  var content = dotsloc('submit',{},res.locals.locale);
  res.status(200).send(dotsloc('base',{
    content:content,
    navSelector:'.navSubmit'},res.locals.locale));
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
        res.status(200).send(dotsloc('mygames',{"games":games},res.locals.locale));
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
      var content = dotsloc('fulllist',{games:games,
        toplinks:toplinks},res.locals.locale);
      res.status(200).send(dotsloc('base',{content:content,
        navSelector:'.navList'},res.locals.locale));
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
      res.status(200).send(dotsloc('base',{setToken: token,
        content:'<p>Success! Your account is now activated!</p>',
        navSelector:'.nothing'},res.locals.locale));
    }
  });
});

// Start the server
const server = app.listen(config.port, function() {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
