(function() {

// Open SQLite database.
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('sf.db');

module.exports.ensureTablesCreated = function() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    passwordhash TEXT,
    active BOOLEAN DEFAULT 0,
    verifyhash TEXT)`);
}

module.exports.getUserByEmail = function(email, callback) {
  db.get('SELECT * FROM users WHERE active = 1 AND email = ($email)',
    {$email:email},
    callback
  );
}

module.exports.getUserById = function(id, callback) {
  db.get('SELECT * FROM users WHERE active = 1 AND id = ($id)',
    {$id:id},
    callback
  );
}

module.exports.insertUser = function(email, hash, verifyhash, callback) {
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
}

module.exports.verifyUser = function(verifyhash, callback) {
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

}());
