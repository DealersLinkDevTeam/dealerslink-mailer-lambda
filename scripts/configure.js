#!/usr/bin/env node

const configFile = './config/sendgrid.credentials.json';
const baseConfigFile = './config/default.sendgrid.credentials.json';

const __ = require('lodash');
const fs = require('fs')
const inquirer = require('inquirer');
const validate = require('./validate');
const baseConfig = require('../config/default.sendgrid.credentials.json');
const config = require('../config/sendgrid.credentials.json');

let conf = __.merge(baseConfig, config);

const questions = [];

function validateInt(val) {
  return validate(val, 'int');
}

function setupQuestions() {
  questions.push({
    type: 'input',
    name: 'key',
    default: conf.key,
    message: 'SendGrid APIKey:'
  });
}

function mapAnswers(answers) {
  conf.key = answers.key;
}

function doConfig() {
  setupQuestions();
  inquirer.prompt(questions)
  .then((answers) => {
    mapAnswers(answers);
    fs.writeFileSync(configFile, `${JSON.stringify(conf, null, 2)}`);
  })
  .catch((err) => {
    console.error(err.stack || err);
  })
}

inquirer.prompt([
  {
    type: 'confirm',
    name: 'ok',
    default: false,
    message: 'This option will overwrite your existing configuration. Are you sure?'
  }
])
.then((answers) => {
  if (answers.ok) {
    doConfig();
  } else {
    console.log('Operation aborted');
  }
})
.catch((err) => {
  console.error(err.stack || err);
});
