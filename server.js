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

// Schedule periodic tasks.
const schedule = require('node-schedule');
const webhooks = require('./webhooks.js');
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

// Register routes.
const routes = require('./routes.js');
app.get ('/',                 routes.routeHomepage);
app.get ('/list/:order',      routes.routeFullList);
app.get ('/list',             function(req,res){res.redirect('/list/alpha');});
app.get ('/submit',           routes.routeSubmitPage);
app.get ('/contactadmin',     routes.routeContactAdmin);
app.post('/contactadmin',     routes.routeSendAdminMessage);

app.post('/register',         routes.routeRegister);
app.get ('/verify/:token',    routes.routeVerifyEmail);
app.post('/login',            routes.routeLogin);
app.post('/myprofile',        routes.routeProfileData);
app.post('/submitgame',       routes.routeSubmitGame);

app.get ('/admin',            routes.routeAdmin);
app.post('/admin',            routes.routeAdminReports);
app.post('/admin/rejectgame', routes.routeRejectGame);
app.post('/admin/banuser',    routes.routeBanUser);

app.get ('/games',            routes.routeGamesData);

// Start the server.
const server = app.listen(config.port, function() {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
