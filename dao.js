(function() {

// Open SQLite database.
const sqlite3 = require('sqlite3').verbose();
var dbFile = 'sf.db'
var db = new sqlite3.Database(dbFile);
console.log('Connected to database '+dbFile);

module.exports = {
  ensureTablesCreated: function() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      passwordhash TEXT,
      active BOOLEAN DEFAULT 0,
      verifyhash TEXT)`);

    db.run(`CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userid INTEGER,
      name TEXT,
      link TEXT,
      authors TEXT,
      private BOOLEAN DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
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

  insertGame: function(userid,gamename,gamelink,gameauthors,callback) {
    db.run('INSERT INTO games (userid,name,link,authors) VALUES ($userid,$name,$link,$authors)',
      {$userid:userid,$name:gamename,$link:gamelink,$authors:gameauthors},
      function(err) {
        if (err) callback(err);
        else if (this.changes) callback();
        else callback("Database error: insert failed to change");
      }
    );
  },

  getGames: function(mindate,callback) {
    db.all('SELECT * FROM games WHERE private = 0 AND createdAt >= $mindate',
      {$mindate:mindate},
      callback
    );
  },

  getPublicListGamesNewest: function(callback) {
    // TODO: return approval date instead of submit date
    db.all('SELECT * FROM games WHERE private = 0 ORDER BY createdAt DESC',
      {},
      callback
    );
  },

  getPublicListGamesAlphabetical: function(callback) {
    // TODO: return approval date instead of submit date
    // TODO: Better alphabetical ordering, e.g. I wanna Cat shows up next to I wanna be the Cat
    db.all('SELECT * FROM games WHERE private = 0 ORDER BY name COLLATE NOCASE ASC',
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
            callback(err, this.lastID);
          } else {
            callback('verifyUser no rows updated');
          }
        }
      }
    );
  }
}

}()); //close function and invoke
