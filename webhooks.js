(function() {

const http = require('http');
const { URL } = require('url');

// Load config.
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config/config.json'));
if (!config.discord_webhook_url) {
  console.log('discord_webhook_url not defined in config.');
  return;
}

var url = new URL(config.discord_webhook_url);
var options = {
  host: url.host,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

module.exports = {
  sendGameSubmitted: function(email, gamename, gameauthors, gamelink) {
    var message = `{email} submitted:\n{gamename}\nby {gameauthors}\ngamelink`;
    var content = JSON.stringify({'content': message});
    console.log(content);
    console.log(options);

    const req = http.request(options, function(res) {
      console.log(res.statusCode);
      console.log(res.statusMessage);
      console.log(res.headers);
      // console.log('Successful post to discord webhook');
    });
    req.write(content);
    req.on('error', function(e) {
      console.log(`problem with discord webhook request: ${e.message}`);
    });
    req.end();
  }
}

}()); //close function and invoke
