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
    text: 'Visit the following URL to verify your account:\n\n'+verifyUrl+'\n\nTODO: more text here including link to the website'
  };
  transporter.sendMail(mailOptions, callback);
}

}());
