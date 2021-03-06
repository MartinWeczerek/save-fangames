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
if (!config.discord_webhook_url_approved_updated) {
  console.log('WARNING: discord_webhook_url_approved_updated not defined in config.');
}

function postDiscord(url, message) {
  if (!url) return;
  if (!Array.isArray(url)) url = [url];
  url.forEach(function(curUrl) {
	  request.post(
		curUrl,
		{json: {content:message, embeds:[]}},
		function(err,rsp,body) {
		  if (err || rsp.statusCode != 204) {
			if (rsp) console.log('webhook error: status code '+rsp.statusCode);
			console.log('webhook error: '+err);
		  }
		}
	  );
  });
}

function gamesMessage(games, linkUpdated) {
  var pluralS = 's';
  if (games.length == 1) pluralS = '';
  var message = "";
  if (linkUpdated) {
    message = `**Update:** (${games.length} game${pluralS})\n`;
  } else {
    message = `**New:** (${games.length} game${pluralS})\n`;
  }
  for (var i=0; i<games.length; i++) {
    var g = games[i];
    if (i >= 1) message += '\n\n';
    message += `${g.name}\nby ${g.authors}\n${g.link}`;
  }
  return message;
}

module.exports = {
  sendGameSubmitted: function(email, gamename, gameauthors, gamelink) {
    var message = `----------\n${email} submitted:\n${gamename}\nby ${gameauthors}\n${gamelink}`;
    postDiscord(config.discord_webhook_url, message)
  },

  sendLinkUpdateSubmitted: function(email, gamename, gamelink) {
    var message = `----------\n${email} updated link of \n${gamename}\nto ${gamelink}`;
    postDiscord(config.discord_webhook_url, message)
  },

  sendContactAdminMessage: function(email, msg) {
    var message = `----------\n${email} contacted admins saying: \n${msg}`;
    postDiscord(config.discord_webhook_url, message);
  },

  sendAdminReply: function(adminemail, useremail, msg) {
    var message = `----------\nAdmin ${adminemail} replied to user ${useremail}, saying: \n${msg}`;
    postDiscord(config.discord_webhook_url, message);
  },

  sendGameApproved: function(game, approver) {
    var message = `----------\n${approver} approved ${game.name}\nby ${game.authors}\n${game.link}`;
    postDiscord(config.discord_webhook_url, message);
    postDiscord(config.discord_webhook_url_approved, gamesMessage([game], false));
  },

  sendGameLinkUpdatesApproved: function(games) {
    postDiscord(config.discord_webhook_url_approved_updated, gamesMessage(games, true));
  }
}

}()); //close function and invoke
