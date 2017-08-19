(function() {

// Open SQLite database.
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('sf.db');

module.exports.ensureTablesCreated = function() {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    passwordhash TEXT,
    salt TEXT)`);
}

module.exports.getUserByEmail = function(email, callback) {
  db.get('SELECT * FROM users WHERE email = ($email)',
    {'$email':email},
    callback
  );
}

module.exports.insertUser = function(email, hash, salt, callback) {
  db.run('INSERT INTO users (email, passwordhash, salt) VALUES ($email, $hash, $salt)', 
    {'$email':email, '$hash':hash, '$salt':salt},
    callback
  );
}

}());
