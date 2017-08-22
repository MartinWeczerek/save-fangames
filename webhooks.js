(function() {

const request = require('request');

// Load config.
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config/config.json'));
if (!config.discord_webhook_url) {
  console.log('discord_webhook_url not defined in config.');
  return;
}

module.exports = {
  sendGameSubmitted: function(email, gamename, gameauthors, gamelink) {
    var message = `${email} submitted:\n${gamename}\nby ${gameauthors}\n${gamelink}`;
    
    request.post(
      config.discord_webhook_url,
      {json: {content:message}},
      function(err,rsp,body) {
        if (err || rsp.statusCode != 200) {
          console.log("webhook error: "+err);
        }
      }
    );
  }
}

}()); //close function and invoke
