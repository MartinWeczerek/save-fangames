(function() {

const nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
  // TODO: load from config
  host: '192.168.56.1',
  port: 25,
  auth: null/*{
    user: 'youremail@example.com',
    pass: 'yourpassword'
  }*/
});

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
