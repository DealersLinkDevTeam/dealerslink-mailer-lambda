#!/usr/bin/env node

const fs = require('fs')
const inquirer = require('inquirer');

const configFile = './config/sendgrid.credentials.json';
const baseConfigFile = './config/default.sendgrid.credentials.json';

function copyFile(src, dest) {
  if (fs.copyFileSync) {
    fs.copyFileSync(src, dest);
  } else {
    fs.createReadStream(src).pipe(fs.createWriteStream(dest));
  }
}

inquirer.prompt([
  {
    type: 'confirm',
    name: 'ok',
    default: false,
    message: 'You are about to destroy the current configuration. Are you sure?'
  }
])
.then((answers) => {
  if (answers.ok) {
    if (fs.existsSync(configFile)) {
      console.log('Removing old configuration');
      fs.unlinkSync(configFile);
    }
    console.log('Copy base configuration back');
    copyFile(baseConfigFile, configFile);
    console.log('Finished');
  } else {
    console.log('Operation aborted');
  }
})
.catch((err) => {
  console.error(err.stack || err);
});
