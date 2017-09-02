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
      banned BOOLEAN DEFAULT 0)`);

    db.run(`CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid INTEGER,
      name TEXT,
      link TEXT,
      authors TEXT,
      private BOOLEAN DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved BOOLEAN DEFAULT 0,
      approvedAt DATETIME,
      rejected BOOLEAN DEFAULT 0,
      rejectedAt DATETIME,
      rejectedBy INTEGER)`);

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

  getReports: function(type, order, answered, callback) {
    if (order != 'ASC' && order != 'DESC') {
      callback('Invalid order given to getReports: '+order);
    }
    if (type == 'all') {
      db.all(`SELECT * FROM reports WHERE answered = $answered ORDER BY id ${order}`,
        {$answered:answered},
        callback);
    } else {
      db.all(`SELECT * FROM reports WHERE type = $type AND answered = $answered ORDER BY id ${order}`,
        {$type:type, $answered:answered},
        callback);
    }
  },

  rejectGame: function(gameid, adminuser, callback) {
    self.getGameById(gameid, function(err,game){
      if (err) callback(err);
      else db.run('UPDATE games SET rejected = 1, approved = 0 WHERE id = $gameid',
        {$gameid:game.id},
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
    self.getUserById(userid,function(err,user){
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

  insertGame: function(user,gamename,gamelink,gameauthors,callback) {
    db.run('INSERT INTO games (userid,name,link,authors) VALUES ($userid,$name,$link,$authors)',
      {$userid:user.id,$name:gamename,$link:gamelink,$authors:gameauthors},
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

  approveMaturedGames: function(callback) {
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

  getGames: function(mindate,callback) {
    db.all('SELECT * FROM games WHERE approved = 1 AND private = 0 AND approvedAt >= $mindate',
      {$mindate:mindate},
      callback
    );
  },

  getGameById: function(id,callback){
    db.get('SELECT * FROM games WHERE approved = 1 AND id = $id',
    {$id:id},callback);
  },

  getGamesByUser: function(userid,callback) {
    db.all('SELECT * FROM games WHERE userid = $userid',
      {$userid:userid},
      callback
    );
  },

  getPublicListGamesNewest: function(callback) {
    // TODO: return approval date instead of submit date
    db.all('SELECT * FROM games WHERE approved = 1 AND private = 0 ORDER BY createdAt DESC',
      {},
      callback
    );
  },

  getPublicListGamesAlphabetical: function(callback) {
    // TODO: return approval date instead of submit date
    // TODO: Better alphabetical ordering, e.g. I wanna Cat shows up next to I wanna be the Cat
    db.all('SELECT * FROM games WHERE approved = 1 AND private = 0 ORDER BY name COLLATE NOCASE ASC',
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
