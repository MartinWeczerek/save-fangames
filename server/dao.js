(function() {

// Open SQLite database.
const sqlite3 = require('sqlite3').verbose();
var dbFile = 'sf.db'
var db = new sqlite3.Database(dbFile);
console.log('Connected to database '+dbFile);

// Load config.
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config/config.json'));
if (!config.approval_game_wait_seconds) {
  throw('approval_game_wait_seconds not defined in config.');
}

var moment = require('moment');

var self = module.exports = {
  ensureTablesCreated: function() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      passwordhash TEXT,
      active BOOLEAN DEFAULT 0,
      verifyhash TEXT,
      admin BOOLEAN DEFAULT 0,
      banned BOOLEAN DEFAULT 0,
      lastip TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);

    db.run(`CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid INTEGER,
      name TEXT,
      sortname TEXT,
      link TEXT,
      authors TEXT,
      private BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved BOOLEAN DEFAULT 0,
      approvedAt DATETIME,
      rejected BOOLEAN DEFAULT 0,
      rejectedAt DATETIME,
      rejectedBy INTEGER,
      linkUpdate TEXT,
      linkUpdateAt DATETIME,
      linkUpdateApproved BOOLEAN DEFAULT 0,
      linkUpdateApprovedAt DATETIME
      )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT,
      target_id INTEGER,
      report TEXT,
      reporter_id INTEGER,
      answered BOOLEAN DEFAULT 0,
      answered_by_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      answered_at DATETIME)`);
  },

  insertReport: function(type, target_id, report, reporter_id, callback) {
    db.run('INSERT INTO reports (type,target_id,report,reporter_id) VALUES ($type,$target_id,$report,$reporter_id)',
      {$type:type, $target_id:target_id, $report:report, $reporter_id:reporter_id},
      callback);
  },

  getReports: function(type, order, answered, limit, offset, callback) {
    if (order != 'ASC' && order != 'DESC') {
      callback('Invalid order given to getReports: '+order);
    }
    if (type == 'all') {
      db.all(`SELECT * FROM reports WHERE answered = $answered
        ORDER BY id ${order} LIMIT ${limit} OFFSET ${offset}`,
        {$answered:answered},
        callback);
    } else {
      db.all(`SELECT * FROM reports WHERE type = $type AND answered = $answered
        ORDER BY id ${order} LIMIT ${limit} OFFSET ${offset}`,
        {$type:type, $answered:answered},
        callback);
    }
  },

  userContactAdminReport: function(user, message, callback) {
    message = `User ${user.email} contacted admins, saying:\n${message}`;
    self.insertReport('user_contact', user.id, message, user.id, callback);
  },

  rejectGame: function(gameid, adminuser, callback) {
    var now = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    self.getGameByIdAdmin(gameid, function(err,game){
      if (err) callback(err);
      else db.run('UPDATE games SET rejected = 1, approved = 0, rejectedAt = ($now) WHERE id = $gameid',
        {$now:now, $gameid:game.id},
        function(err){
        if (err) callback(err);
        else {
          var report = `Game ${game.name} was rejected by ${adminuser.email}`;
          self.insertReport('admin', game.id, report, adminuser.id, callback);
        }
      });
    })
  },

  banUser: function(userid, adminuser, callback) {
    self.getUserByIdAdmin(userid,function(err,user){
      if (err) callback(err);
      else db.run('UPDATE users SET banned = 1 WHERE id = $userid',
        {$userid:user.id},
        function(err){
        if (err) callback(err);
        else {
          var report = `User ${user.email} was banned by ${adminuser.email}`;
          self.insertReport('admin', user.id, report, adminuser.id, callback);
        }
      });
    });
  },

  getUserByEmail: function(email, callback) {
    db.get('SELECT * FROM users WHERE active = 1 AND email = ($email)',
      {$email:email},
      callback
    );
  },

  getUserByIdAdmin: function(id, callback) {
    db.get('SELECT * FROM users WHERE id = ($id)',{$id:id},callback);
  },

  getUserById: function(id, callback) {
    db.get('SELECT * FROM users WHERE active = 1 AND id = ($id)',
      {$id:id},
      callback
    );
  },

  insertUser: function(email, hash, verifyhash, callback) {
    db.run('UPDATE users SET verifyhash = ($verifyhash), passwordhash = ($hash) WHERE active = 0 and email = ($email)',
      {$verifyhash:verifyhash, $hash:hash, $email:email},
      function(err) {
        if (err) {
          callback(err);
        } else {
          if (this.changes) { // set by sqlite3
            callback();
          } else {
            db.run('INSERT INTO users (email, passwordhash, active, verifyhash) VALUES ($email, $hash, 0, $verifyhash)',
              {$verifyhash: verifyhash,$email: email,$hash: hash},
              callback);
          }
        }
      }
    );
  },

  getUsersAdmin: function(callback) {
    db.all('SELECT * FROM users ORDER BY id DESC',{},callback);
  },

  updateUserLastIP: function(userid, lastip, callback) {
    db.run('UPDATE users SET lastip = ($lastip) WHERE id = ($id)',
      {$lastip:lastip, $id:userid}, callback);
  },

  insertGame: function(user,gamename,gamelink,gameauthors,callback) {
    var sortname = self.gameSortName(gamename);
    db.run('INSERT INTO games (userid,name,sortname,link,authors) VALUES ($userid,$name,$sortname,$link,$authors)',
      {$userid:user.id,$name:gamename,$sortname:sortname,
          $link:gamelink,$authors:gameauthors},
      function(err) {
        if (err) callback(err);
        else if (this.changes) {
          var report = `${user.email} submitted game ${gamename} by ${gameauthors} link ${gamelink}`
          self.insertReport('game_submit', this.lastID, report, user.id, callback);
        }
        else callback("Database error: insert failed to change");
      }
    );
  },

  gameSortName: function(gamename) {
    // Remove standard fangame name prefixes
    var regEx = new RegExp('i wanna be the ', 'ig');
    gamename = gamename.replace(regEx, '');
    var regEx = new RegExp('i wanna ', 'ig');
    gamename = gamename.replace(regEx, '');
    return gamename
  },

  approveMaturedGames: function(callback) {
    // TODO: Learn SQL and how to return the rows from an UPDATE in one query
    // (same for the link updates function below)
    var now = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    var cutoff = moment.utc().subtract(config.approval_game_wait_seconds, 'seconds').format('YYYY-MM-DD HH:mm:ss');
    db.all('SELECT * FROM games WHERE approved = 0 AND createdAt < ($cutoff) AND rejected = 0',
    {$cutoff:cutoff},
    function(err,rows){
      if (err) {
        callback(err);
        return;
      }
      db.run('UPDATE games SET approved = 1, approvedAt = ($now) WHERE approved = 0 AND createdAt < ($cutoff) AND rejected = 0',
      {$now:now, $cutoff:cutoff},
      function(err){
        callback(err,rows);
      });
    });
  },

  updateGameLink: function(gameid, link, userid, callback) {
    var now = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    db.run('UPDATE games SET linkUpdate = ($link), linkUpdateAt = ($now), linkUpdateApproved = 0 WHERE id = ($gameid) AND userid = ($userid)',
    {$link:link, $now:now, $gameid:gameid, $userid:userid}, callback);
  },

  approveMaturedGameLinkUpdates: function(callback) {
    var now = moment().utc().format('YYYY-MM-DD HH:mm:ss');
    var cutoff = moment.utc().subtract(config.approval_game_wait_seconds, 'seconds').format('YYYY-MM-DD HH:mm:ss');
    db.all('SELECT * FROM games WHERE linkUpdate != "" AND linkUpdateApproved = 0 AND linkUpdateAt < ($cutoff) AND rejected = 0',
    {$cutoff:cutoff},
    function(err,rows){
      if (err) {
        callback(err);
        return;
      }
      db.run('UPDATE games SET link = linkUpdate, linkUpdateApproved = 1, linkUpdateApprovedAt = ($now) WHERE linkUpdate != "" AND linkUpdateApproved = 0 AND linkUpdateAt < ($cutoff) AND rejected = 0',
      {$now:now, $cutoff:cutoff},
      function(err){
        callback(err,rows);
      });
    });
  },

  getGamesAdmin: function(callback) {
    db.all('SELECT * FROM games ORDER BY id DESC',{},callback);
  },

  getGames: function(mindate,callback) {
    db.all('SELECT * FROM games WHERE approved = 1 AND private = 0 AND approvedAt >= $mindate',
      {$mindate:mindate},
      callback
    );
  },

  getGameByIdAdmin: function(id,callback){
    db.get('SELECT * FROM games WHERE id = $id',
    {$id:id},callback);
  },

  getGamesByUser: function(userid,callback) {
    db.all('SELECT * FROM games WHERE userid = $userid',
      {$userid:userid},
      callback
    );
  },

  getPublicListGamesNewest: function(callback) {
    db.all('SELECT * FROM games WHERE approved = 1 AND private = 0 ORDER BY approvedAt DESC',
      {},
      callback
    );
  },

  getPublicListGamesAlphabetical: function(callback) {
    db.all('SELECT * FROM games WHERE approved = 1 AND private = 0 ORDER BY sortname COLLATE NOCASE ASC',
      {},
      callback
    );
  },

  verifyUser: function(verifyhash, callback) {
    db.run('UPDATE users SET verifyhash = (""), active = 1 WHERE active = 0 AND verifyhash = ($verifyhash)',
      {$verifyhash:verifyhash},
      function(err) {
        if (err) {
          callback(err);
        } else {
          if (this.changes) { // set by sqlite3
            self.getUserById(this.lastID, function(err, user) {
              if (err) {
                callback(err);
              } else {
                var report = `${user.email} verified their email/account.`;
                self.insertReport('user_verify', user.id, report, user.id,
                  function(err){callback(err, user);});
              }
            });
          } else {
            callback('verifyUser no rows updated');
          }
        }
      }
    );
  }
}

}()); //close function and invoke
