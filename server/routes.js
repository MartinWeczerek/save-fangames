(function() {

const maxlenEmail = 100;
const minlenPassword = 6;
const maxlenGameName = 100;
const maxlenGameAuthors = 200;
const maxlenGameLink = 200;
const maxlenContactAdmin = 1000;

// Load config.
const fs = require('fs');
const configPath = 'config/config.json';
var config = JSON.parse(fs.readFileSync(configPath));
if (!config.jwt_secret) {
  throw('jwt_secret not defined in config.');
}
if (!config.root_url) {
  throw('root_url not defined in config.');
}

const jwt = require('jsonwebtoken');
const moment = require('moment');
const bcrypt = require('bcrypt');
const saltRounds = 10;
const uuidv4 = require('uuid/v4'); // Version 4 is Random
//const { URL } = require('url');
const URL = require('url').Url;

const mail = require('./mail.js');
const webhooks = require('./webhooks.js');
const dao = require('./dao.js');

// Parse localized DoT templates.
var dots = require('dot').process({path: './loc_dot_views'});

// dotsloc executes a DoT template of a specified locale.
function dotsloc(templatename, data, locale) {
  return dots[templatename+'_'+locale](data);
}

// verifyAuth parses a request's JWT token and either callback-returns a user
// object if valid, or sends an error message on the response.
function verifyAuth(req,res,adminonly,callback){
  dao.isIPBanned(req.ip, function(err, ipban) {
    if (err) {
      console.log(err);
      res.status(500).send({Message:"Database error."});
      return;
    }
    if (ipban) {
      res.status(401).send({Message: 'Unauthorized.'});
      return;
    }

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
  });
}

// generateToken generates a JWT token based on a user object.
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

// limitString sends 400 to response and returns true if string is too long.
function limitString(len, maxlen, res, specific) {
  if (len > maxlen) {
    res.status(400).send({Message:`Too many characters${specific}: ${len}/${maxlen}`});
    return true;
  }
  return false;
}

var self = module.exports = {

routeHomepage: function(req, res) {
  var today = moment().utc().hour(0).minute(0).second(0).millisecond(0);
  var mindate = today.subtract(6, 'days').format('YYYY-MM-DD HH:mm:ss');
  dao.getGames(mindate,function(err,games){
    if (err) {
      console.log(err);
      res.status(500).send({Message:"Database error."});
    } else {
      dao.getUpdatedGames(mindate,function(err,updated) {
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
          group.games.push({name:g.name, link:g.link, authors:g.authors});
        }
        releases.reverse();

        var updates = [];
        var group = {};
        for (var i=0; i<updated.length; i++) {
          var g = updated[i];
          var m = moment(g.linkUpdateApprovedAt, 'YYYY-MM-DD HH:mm:ss');
          var day = m.format('MM-DD');
          if (day != group.date) {
            group = {date:day, games:[]};
            updates.push(group);
          }
          group.games.push({name:g.name, link:g.link, authors:g.authors});
        }
        updates.reverse();

        var content = dotsloc('homepage',{releases:releases, updates:updates},res.locals.locale);
        res.status(200).send(dotsloc('base',{
          content:content,
          navSelector:'.navHome'},res.locals.locale));
      }
      });
    }
  });
},

routeOffline: function(req, res) {
  res.status(200).send(dotsloc('offline',{},res.locals.locale));
},

routeContactAdmin: function(req, res) {
  res.status(200).send(dotsloc('base',{
    content:'<div id="contactadminroot"></div>',
    navSelector:'.nothing'},res.locals.locale));
},

routeSendAdminMessage: function(req, res) {
  verifyAuth(req,res,false,function(user){
    if (limitString(req.body.message.length, maxlenContactAdmin, res, "")) {
      return;
    }
    dao.userContactAdminReport(user,req.body.message,function(err){
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        webhooks.sendContactAdminMessage(user.email, req.body.message);
        res.status(200).send();
      }
    });
  });
},

routeForgotPassword: function(req, res) {
  var content = dotsloc('forgotpassword',{},res.locals.locale);
  res.status(200).send(dotsloc('base',{content:content,
    navSelector:'.nothing'},res.locals.locale));
},

routeForgotPasswordPost: function(req, res) {
  var forgotHash = uuidv4();
  var forgotUrl = config.root_url+'/resetpassword/'+forgotHash;
  dao.userForgetPassword(req.body.email, forgotHash, function(err){
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        mail.sendForgotPasswordMail(req.body.email, forgotUrl, function(error, info) {
          if (error) {
            console.log(error);
            res.status(500).send({Message: 'Failed to send email.'});
          } else {
            console.log('Email sent: ' + info.response);
            res.status(200).send();
          }
        });
      }
  });
},

routeResetPassword: function(req, res) {
  var token = req.params.token;
  if (!token) {
    res.status(400).send({Message: 'Must provide token in url.'});
  }
  dao.getUserByForgotHash(token, function(err, user) {
    if (err) {
      console.log(err);
      res.status(500).send({Message: 'Database error.'});
    } else if (!user) {
      res.status(400).send({Message: 'Not a valid password reset link.'});
    } else {
      var content = dotsloc('resetpassword',{token:token},res.locals.locale);
      res.status(200).send(dotsloc('base',{content:content,
        navSelector:'.nothing'},res.locals.locale));
    }
  });
},

routeResetPasswordPost: function(req, res) {
  dao.getUserByForgotHash(req.body.token, function(err, user) {
    if (err) {
      console.log(err);
      res.status(500).send({Message: 'Database error.'});
    } else if (!user) {
      res.status(400).send({Message: 'Not a valid password reset token.'});
    } else {
      var hash = bcrypt.hashSync(req.body.password, saltRounds);
      dao.resetUserPassword(req.body.token, hash, function(err) {
        if (err) {
          console.log(err);
          res.status(500).send({Message: 'Database error.'});
        } else {
          res.status(200).send();
        }
      });
    }
  });
},

routeAbout: function(req, res) {
  var content = dotsloc('about',{},res.locals.locale);
  res.status(200).send(dotsloc('base',{content:content,
    navSelector:'.navAbout'},res.locals.locale));
},

routeMyGamesPage:  function(req, res) {
  var content = dotsloc('mygames',{},res.locals.locale);
  res.status(200).send(dotsloc('base',{
    content:content,
    navSelector:'.navSubmit'},res.locals.locale));
},

routeSubmitPage:  function(req, res) {
  var content = dotsloc('submit',{},res.locals.locale);
  res.status(200).send(dotsloc('base',{
    content:content,
    navSelector:'.navSubmit'},res.locals.locale));
},

routeAdminList: function(req, res) {
  res.status(200).send(dotsloc('base',{
    content:'<div id="adminlistroot"></div>',
    navSelector:'.navAdmin'},res.locals.locale));
},

routeAdminGames: function(req, res) {
  verifyAuth(req,res,true,function(user){
    dao.getGamesAdmin(function(err, games) {
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        res.status(200).send(games);
      }
    });
  });
},

routeAdminUsers: function(req, res) {
  verifyAuth(req,res,true,function(user){
    dao.getUsersAdmin(function(err, users) {
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        res.status(200).send(users);
      }
    });
  });
},

routeAdminIPBans: function(req, res) {
  verifyAuth(req,res,true,function(user){
    dao.getIPBansAdmin(function(err, users) {
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        res.status(200).send(users);
      }
    });
  });
},

routeAdmin: function(req, res) {
  res.status(200).send(dotsloc('base',{
    content:'<div id="adminroot"></div>',
    navSelector:'.navAdmin'},res.locals.locale));
},

routeAdminReports: function(req, res) {
  verifyAuth(req,res,true,function(user){
    var pageLength = 20;
    dao.getReports(req.body.type,req.body.order,req.body.answered,
      pageLength,pageLength*parseInt(req.body.pagenum),
      function(err,reports){
        if (err) {
          console.log(err);
          res.status(500).send({Message:"Database error."});
        } else {
          res.status(200).send(reports);
        }
      });
  });
},

routeRejectGame: function(req, res) {
  var rejectId = req.body.gameid
  verifyAuth(req,res,true,function(user){
    dao.rejectGame(rejectId,req.body.msg,user,function(err){
        if (err) {
          console.log(err);
          res.status(500).send({Message:"Database error."});
        } else {
          //try to send rejection email
          dao.getRejectInfo(rejectId,function(err,obj){
            if (obj.rejectedMsg != '') {
              mail.sendRejectMail(obj.email,obj.name,obj.rejectedMsg,function(err){
                if (err) console.log(err);
              });
            }
          });
          res.status(200).send();
        }
      });
  });
},

routeApproveGame: function(req, res) {
  var id = req.body.gameid
  verifyAuth(req,res,true,function(user){
    dao.approveGame(id,function(err){
        if (err) {
          console.log(err);
          res.status(500).send({Message:"Database error."});
        } else {
          dao.getGameByIdAdmin(id, function(err, game) {
            if (err) {
              console.log(err);
              res.status(500).send({Message:"Database error."});
            } else {
              webhooks.sendGameApproved(game, user.name);
              res.status(200).send();
            }
          });
        }
      });
  });
},

routeBanUser: function(req, res) {
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
},

routeIPBan: function(req, res) {
  verifyAuth(req,res,true,function(user){
    dao.insertIPBan(req.body.ip,user,function(err){
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        res.status(200).send();
      }
    });
  });
},

routeIPUnban: function(req, res) {
  verifyAuth(req,res,true,function(user){
    dao.deleteIPBan(req.body.ip,user,function(err){
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        res.status(200).send();
      }
    });
  });
},

routeAdminReply: function(req, res) {
  verifyAuth(req,res,true,function(adminuser){
    dao.getUserByIdAdmin(req.body.userid, function(err, user) {
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {

        mail.sendAdminReplyMail(user.email, adminuser.name, req.body.msg, function(error, info) {
          if (error) {
            console.log(error);
            res.status(500).send({Message: 'Failed to send email.'});
          } else {

            console.log('Email sent: ' + info.response);
            webhooks.sendAdminReply(adminuser.email, user.email, req.body.msg);
            dao.userContactReply(adminuser,req.body.userid,user.email,req.body.msg,function(err){
              if (err) {
                console.log(err);
                res.status(500).send({Message:"Database error."});
              } else {
                res.status(200).send();
              }
            });

          }
        });

      }
    });

  });
},

routeMyGames: function(req, res) {
  verifyAuth(req,res,false,function(user){
    dao.getGamesByUser(user.id,function(err,games){
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
      } else {
        // Only send the user info they need to know about their games.
        // TODO: move this to SQL SELECT query
        var now = moment().utc();
        var limgames = [];
        for (var i=0; i<games.length; i++) {
          var g = games[i];
          // TODO: hardcoded timezone offset!
          var approveTime = moment(g.createdAt, 'YYYY-MM-DD HH:mm:ss').add(
              config.approval_game_wait_seconds,'seconds').subtract(
              parseInt(config.hacky_timezone_offset), 'hours');
          var timeLeftApprove = approveTime.fromNow();
          var updateApproveTime = moment(g.linkUpdateAt, 'YYYY-MM-DD HH:mm:ss').add(
              config.approval_game_wait_seconds,'seconds').subtract(
              parseInt(config.hacky_timezone_offset), 'hours');
          var timeLeftUpdate = updateApproveTime.fromNow();
          limgames.push({id:g.id, name:g.name, link:g.link, authors:g.authors,
            createdAt:g.createdAt, approvedAt:g.approvedAt,
            rejected:g.rejected, approved:g.approved,
            linkUpdate:g.linkUpdate, linkUpdateAt:g.linkUpdateAt,
            linkUpdateApproved:g.linkUpdateApproved,
            linkUpdateApprovedAt:g.linkUpdateApprovedAt,
            timeLeftApprove:timeLeftApprove,
            timeLeftUpdate:timeLeftUpdate
            });
        }
        res.status(200).send(limgames);
      }
    });
  });
},

routeFullList: function(req, res) {
  var daoFunc;
  var linkactive;
  if (req.params.order == 'new') {
    daoFunc = dao.getPublicListGamesNewest;
    linkactive = 'new';
  } else if (req.params.order == 'alpha') {
    daoFunc = dao.getPublicListGamesAlphabetical;
    linkactive = 'alpha';
  } else if (req.params.order == 'author') {
    daoFunc = dao.getPublicListGamesAuthor;
    linkactive = 'author';
  } else {
    res.status(404).send();
    return;
  }

  daoFunc(function(err,games){
    if (err) {
      console.log(err);
      res.status(500).send({Message:"Database error."});
    } else {
      for (var i=0; i<games.length; i++) {
        var m = moment(games[i].approvedAt, 'YYYY-MM-DD HH:mm:ss');
        games[i].approvedAt = m.format('YYYY-MM-DD');
      }
      var content = dotsloc('fulllist',{games:games,
        linkactive:linkactive},res.locals.locale);
      res.status(200).send(dotsloc('base',{content:content,
        navSelector:'.navList'},res.locals.locale));
    }
  });
},

// TODO: verify API key so only Delfruit can access?
routeGamesData: function(req, res) {
  dao.getGames(req.query.mindate,function(err,games){
    if (err) {
      console.log(err)
      res.status(500).send({Message:"Database error."});
    } else {
      res.status(200).send(games);
    }
  });
},

routeSubmitGame: function(req, res) {
  verifyAuth(req,res,false,function(user){
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

    if (limitString(gamename.length, maxlenGameName, res, " in game name")
        || limitString(gamelink.length, maxlenGameLink, res, " in game link")
        || limitString(gameauthors.length, maxlenGameAuthors, res,
        " in game authors")) {
      return;
    }

    try {
      new URL(gamelink);
    }catch(e){
      console.log(e);
      res.status(400).send({Message: `Invalid URL: ${gamelink}.`});
      return;
    }

    dao.insertGame(user, gamename, gamelink, gameauthors, function(err){
      if (err) {
        console.log('SQLite error:');
        console.log(err);
        res.status(500).send({Message: 'Database error.'});
        return;
      }
      console.log('Game submitted');
      webhooks.sendGameSubmitted(user.email, gamename, gameauthors, gamelink);
      res.status(200).send({Message: "Success!"})
      // TODO: possibly 400 if game name (link?) is already in the list
    });
  });
},

routeUpdateGame: function(req, res) {
  verifyAuth(req,res,false,function(user){
    var gamelink = req.body.gamelink;
    if (!gamelink) {
      res.status(400).send({Message: "Game link cannot be empty."});
      return;
    }
    if (limitString(gamelink.length, maxlenGameLink, res, " in game link")) {
      return;
    }
    
    try {
      new URL(gamelink);
    }catch(e){
      res.status(400).send({Message: `Invalid URL: ${gamelink}.`});
      return;
    }

    dao.updateGameLink(req.body.game.id, gamelink, user.id, function(err){
      if (err) {
        console.log(err);
        res.status(500).send({Message: 'Database error.'});
      } else {
        console.log('Game link update submitted');
        webhooks.sendLinkUpdateSubmitted(user.email, req.body.game.name, gamelink);
        res.status(200).send({Message: "Success!"})
      }
    });
  });
},

routeRegister: function(req, res) {
  // TODO: Rate limit /register so malicious peeps can't send a bajillion emails
  // Sanitize input.
  var email = req.body.email;
  var password = req.body.password;
  if (!email) {
    res.status(400).send({Message: 'Email cannot be empty.'});
    return;
  }
  if (limitString(email.length, maxlenEmail, res, ' in email')) {
    return;
  }

  // TODO: password strength check
  if (!password) {
    res.status(400).send({Message: 'Password cannot be empty.'});
    return;
  }
  if (password.length < minlenPassword) {
    res.status(400).send({Message: `Password must be at least ${minlenPassword} characters.`});
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

    dao.isIPBanned(req.ip, function(err, ipban) {
      if (err) {
        console.log(err);
        res.status(500).send({Message:"Database error."});
        return;
      }
      if (ipban) {
        res.status(401).send({Message: 'Unauthorized.'});
        return;
      }

      // Add user to the database.
      var verifyHash = uuidv4();
      var verifyUrl = config.root_url+'/verify/'+verifyHash;

      var hash = bcrypt.hashSync(password, saltRounds);
      dao.insertUser(email, hash, verifyHash, req.ip, function(err){
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
},

routeLogin: function(req, res) {
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
        // TODO: verify from actual server this is the correct IP
        dao.updateUserLastLogin(row.id, req.ip, function(err) {
          if (err) {
            console.log(err);
            res.status(500).send({Message: 'Database error.'});
          } else {
            var token = generateToken(row);
            res.status(200).send({Email: email, Token: token});
          }
        });
      }
    } else {
      res.status(401).send({Message: 'Unauthorized.'});
    }
  });
},

routeVerifyEmail: function(req, res) {
  var token = req.params.token;
  if (!token) {
    res.status(400).send({Message: 'Must provide token in url.'});
  }
  dao.verifyUser(token, function(err, user) {
    if (err) {
      console.log(err);
      res.status(400).send({Message: 'Database error.'});
    } else {
      // TODO: verify from actual server this is the correct IP
      dao.updateUserLastLogin(user.id, req.ip, function(err) {
        if (err) {
          console.log(err);
          res.status(500).send({Message: 'Database error.'});
        } else {
          var token = generateToken(user);
          res.status(200).send(dotsloc('base',{setToken: token,
            content:'<p>Success! Your account is now activated!</p>',
            navSelector:'.nothing'},res.locals.locale));
        }
      });
    }
  });
}

};

}());
