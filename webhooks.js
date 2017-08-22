(function() {

const request = require('request');

// Load config.
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config/config.json'));

module.exports = {
  sendGameSubmitted: function(email, gamename, gameauthors, gamelink) {
    if (!config.discord_webhook_url) return;

    var message = `${email} submitted:\n${gamename}\nby ${gameauthors}\n${gamelink}`;
    
    request.post(
      config.discord_webhook_url,
      {json: {content:message}},
      function(err,rsp,body) {
        if (err || rsp.statusCode != 204) {
          console.log("webhook error: "+err);
        }
      }
    );
  }
}

}()); //close function and invoke
