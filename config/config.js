module.exports = {
  mock: false,
  test: false,
  testEmail: 'dev@dealerslink.com',
  credentials: {
    sendgrid: require(`${__dirname}/sendgrid.credentials.json`)
  }
};
