(function() {

const nodemailer = require('nodemailer');

// Load config.
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config/config.json'));
if (!config.mail) {
  throw('mail defined in config.');
}
if (!config.mail.options) {
  throw('mail.options not defined in config.');
}
if (!config.mail.from) {
  throw('mail.from not defined in config.');
}

// TODO: make sure emails aren't marked as spam?
// https://stackoverflow.com/questions/371/how-do-you-make-sure-email-you-send-programmatically-is-not-automatically-marked#396
var transporter = nodemailer.createTransport(config.mail.options);

transporter.verify(function(error, success) {
  if (error) {
    console.log('Mail server not working properly:');
    throw error;
   } else {
    console.log('Mail server is ready to take our messages');
   }
});

module.exports.sendAccountVerificationMail = function(to, verifyUrl, callback) {
  var mailOptions = {
    from: config.mail.from,
    to: to,
    subject: 'Fangame account verification',
    text: 'Visit the following URL to verify your Blue Fruit account:\n\n'+verifyUrl
  };
  transporter.sendMail(mailOptions, callback);
}

module.exports.sendRejectMail = function(to, gameName, msg, callback) {
  var mailOptions = {
    from: config.mail.from,
    to: to,
    subject: 'Fangame rejected',
    text: 'Your game submission, '+gameName+', was rejected for reason: '+msg+
    '\n\nIf you feel this was an error, please contact the admins.'+
    '\n\nRegards, the admins of Blue Fruit'
  };
  transporter.sendMail(mailOptions, callback);
}

module.exports.sendAdminReplyMail = function(to, adminname, msg, callback) {
  var mailOptions = {
    from: config.mail.from,
    to: to,
    subject: 'Admin response',
    text: 'An administrator, '+adminname+', replied to your message:\n\n'+msg
  };
  transporter.sendMail(mailOptions, callback);
}

}());
