// Load config.
var fs = require('fs');
const configPath = 'config/config.json';
if (!fs.existsSync(configPath)) {
  throw(configPath+' does not exist.');
}
var config = JSON.parse(fs.readFileSync(configPath));
if (!config.port) {
  throw('port not defined in config.');
}
if (!config.approval_check_schedule) {
  throw('approval_check_schedule not defined in config.');
}

// Connect to DB and create tables if don't exist already.
var dao = require('./dao.js');
dao.ensureTablesCreated()

// Create express app.
process.env.NODE_ENV = 'production'; // So we don't return stack trace on error
const express = require('express');
const app = express();

// TODO: prevent hard crashes such as calling nonexistent function (link below)
// https://stackoverflow.com/questions/5999373/how-do-i-prevent-node-js-from-crashing-try-catch-doesnt-work#22424428

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

// Locale cookie midddleware
// Sets res.locals.locale, and sets Set-Cookie header if no locale cookie.
app.use(function (req,res,next){
  var locale = req.cookies.locale;
  //unset locale if not a supported one
  if (['en','jp'].indexOf(locale) == -1) locale = '';
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

// Cache middleware.
// https://medium.com/the-node-js-collection/simple-server-side-cache-for-express-js-with-node-js-45ff296ca0f0
const memorycache = require('memory-cache');
const mcache = (seconds) => {
  return (req, res, next) => {
    var key = '__express__'+req.originalUrl || req.url;
    let cachedBody = memorycache.get(key);
    if (cachedBody) {
      res.send(cachedBody);
    } else {
      res.oldSend = res.send;
      res.send = (body) => {
        memorycache.put(key, body, 1000*seconds);
        res.oldSend(body);
      }
      next();
    }
  };
};

// Schedule periodic tasks.
const schedule = require('node-schedule');
const webhooks = require('./webhooks.js');
schedule.scheduleJob(config.approval_check_schedule,function(){
  dao.approveMaturedGames(function(err,game){
    if (err) {
      console.log(err);
      return;
    }
    console.log(`[${game.id}] ${game.name} approved`);
    webhooks.sendGameApproved(game, 'Auto-approve');
  });

  dao.approveMaturedGameLinkUpdates(function(err,games){
    if (err) {
      console.log(err);
      return;
    }
    if (games.length > 0) {
      console.log(`${games.length} game link updates approved`);
      webhooks.sendGameLinkUpdatesApproved(games);
    }
  });
});

// Host static content.
app.use(express.static(__dirname + '/../static', {
  extensions: ['html'] // so "/submit" works as well as "/submit.html"
}));

//generic error handler
app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

// Register routes.
const routes = require('./routes.js');
app.get ('/',                 routes.routeHomepage);
// TODO: cache separate versions of page for each locale?
app.get ('/list/:order',      /*mcache(60*10),*/ routes.routeFullList);
app.get ('/list',             function(req,res){res.redirect('/list/alpha');});
app.get ('/mygames',          routes.routeMyGamesPage);
app.get ('/submit',           routes.routeSubmitPage);
app.get ('/about',            routes.routeAbout);
app.get ('/contactadmin',     routes.routeContactAdmin);
app.post('/contactadmin',     routes.routeSendAdminMessage);

app.post('/register',         routes.routeRegister);
app.get ('/verify/:token',    routes.routeVerifyEmail);
app.post('/login',            routes.routeLogin);
app.post('/mygames',          routes.routeMyGames);
app.post('/submitgame',       routes.routeSubmitGame);
app.post('/updategame',       routes.routeUpdateGame);

app.get ('/admin',            routes.routeAdmin);
app.post('/admin',            routes.routeAdminReports);
app.post('/admin/rejectgame', routes.routeRejectGame);
app.post('/admin/approvegame',routes.routeApproveGame);
app.post('/admin/banuser',    routes.routeBanUser);
app.post('/admin/ipban',      routes.routeIPBan);
app.post('/admin/ipunban',    routes.routeIPUnban);
app.post('/admin/reply',      routes.routeAdminReply);

app.get ('/admin/list',       routes.routeAdminList);
app.post('/admin/games',      routes.routeAdminGames);
app.post('/admin/users',      routes.routeAdminUsers);
app.post('/admin/ipbans',     routes.routeAdminIPBans);

app.get ('/games',            routes.routeGamesData);

// Start the server.
const server = app.listen(config.port, function() {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
