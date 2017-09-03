(function() {

const request = require('request');

// Load config.
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config/config.json'));
if (!config.discord_webhook_url) {
  console.log('WARNING: discord_webhook_url not defined in config.');
}
if (!config.discord_webhook_url_approved) {
  console.log('WARNING: discord_webhook_url_approved not defined in config.');
}

function postDiscord(url, message) {
  request.post(
    url,
    {json: {content:message}},
    function(err,rsp,body) {
      if (err || rsp.statusCode != 204) {
        console.log("webhook error: "+err);
      }
    }
  );
}

module.exports = {
  sendGameSubmitted: function(email, gamename, gameauthors, gamelink) {
    if (!config.discord_webhook_url) return;
    var message = `${email} submitted:\n${gamename}\nby ${gameauthors}\n${gamelink}`;
    postDiscord(config.discord_webhook_url, message)
  },

  sendGamesApproved: function(games) {
    if (!config.discord_webhook_url_approved) return;
    var pluralS = 's';
    if (games.length == 1) pluralS = '';
    var message = `${games.length} game${pluralS} approved:`;
    for (var i=0; i<games.length; i++) {
      var g = games[i];
      message += `\n\n${g.name}\nby ${g.authors}\n${g.link}`;
    }
    postDiscord(config.discord_webhook_url_approved, message);
  }
}

}()); //close function and invoke
