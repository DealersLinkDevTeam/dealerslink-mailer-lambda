// app/lib/mailer.js
const sgMail = require('@sendgrid/mail');

class Mailer {
  constructor(conf) {
    this.conf = conf;
    this.testEmail = conf.testEmail || 'dev@dealerslink.com';
    this.sendgridKey = this.conf.credentials.sendgrid.key;
    sgMail.setApiKey(this.sendgridKey);
  }

  dispatch(mailTo, mailFrom, subject, message, mock, test) {
    try {
      mock = mock || this.conf.mock;
      test = test || this.conf.test;
      // Send the mail here
      const msg = {
        to: mailTo || this.testEmail,
        from: mailFrom,
        subject: subject,
        text: message
      };
      if (test) { msg.to = this.testEmail; }
      console.log('Delivering Email');
      console.log(`${JSON.stringify(msg)}`);
      if (!mock) {
        return sgMail.send(msg);
      }
      return Promise.resolve(msg);
    } catch (err) {
      console.log(err);
      return Promise.reject(err);
    }
  }
}

module.exports = Mailer;
