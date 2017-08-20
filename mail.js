(function() {

const nodemailer = require('nodemailer');

// Load config.
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config/config.json'));
if (!config.mail || !config.mail.options) {
  console.log('mail.options not defined in config.');
  return;
}

var transporter = nodemailer.createTransport(config.mail.options);

transporter.verify(function(error, success) {
  if (error) {
    console.log('Mail server not working properly:');
    console.log(error);
   } else {
    console.log('Mail server is ready to take our messages');
   }
});

module.exports.sendAccountVerificationMail = function(to, verifyUrl, callback) {
  var mailOptions = {
    from: 'test@test.com', // TODO: load from config
    to: to,
    subject: 'Fangame account verification',
    text: 'Visit the following URL to verify your account:\n\n'+verifyUrl+'\n\nTODO: more text here including link to the website'
  };
  transporter.sendMail(mailOptions, callback);
}

}());
