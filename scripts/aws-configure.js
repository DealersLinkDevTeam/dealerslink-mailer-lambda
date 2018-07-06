#!/usr/bin/env node

const __ = require('lodash');
const program = require('commander');
const inquirer = require('inquirer');
const modifyFiles = require('./utils');
const pack = require('../package.json');

const availableRegions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'sa-east-1'
];

const options = {
  region: null,
  account: null,
  bucket: null,
  cfstack: null,
  sqsTaskQueue: null,
  sqsDeadLetterQueue: null,
  lambdaConsumer: null,
  lambdaWorker: null
};

const questions = [];

function performModify() {
  modifyFiles(['./package.json'],
    [{
      regexp: /("region": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.region}",`
    }, {
      regexp: /("accountId": )"(\w*)",/,
      replacement: `$1"${options.account}",`
    }, {
      regexp: /("cloudFormationStackName": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.cfstack}",`
    }, {
      regexp: /("s3BucketName": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.bucket}",`
    }, {
      regexp: /("sqsTaskName": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.sqsTaskQueue}",`
    }, {
      regexp: /("sqsDeadLetterName": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.sqsDeadLetterQueue}",`
    }, {
      regexp: /("lambdaConsumerFunctionName": )"([A-Za-z0-9_-]*)",/,
      replacement: `$1"${options.lambdaConsumer}",`
    }, {
      regexp: /("lambdaWorkerFunctionName": )"([A-Za-z0-9_-]*)"/,
      replacement: `$1"${options.lambdaWorker}"`
    }]
  );

  modifyFiles(['./cloudformation.yaml'],
    [{
      regexp: /^(Resources:\n  )(\w*):$/m,
      replacement: `$1${options.sqsTaskQueue}:`
    }, {
      regexp: /^(            - sqs:ReceiveMessage\n            Resource: !GetAtt )(.*)$/m,
      replacement: `$1${options.sqsTaskQueue}.Arn`
    }, {
      regexp: /^(          TASK_QUEUE_URL: !Ref )(.*)$/gm,
      replacement: `$1${options.sqsTaskQueue}`
    }, {
      regexp: /^(            - sqs:DeleteMessage\n            Resource: !GetAtt )(.*)$/m,
      replacement: `$1${options.sqsTaskQueue}.Arn`
    }, {
      regexp: /^(        maxReceiveCount: 10\n  )(.*):$/m,
      replacement: `$1${options.sqsDeadLetterQueue}:`
    }, {
      regexp: /^(        deadLetterTargetArn: !GetAtt )(.*)$/m,
      replacement: `$1${options.sqsDeadLetterQueue}.Arn`
    }, {
      regexp: /^(  .*)(:\n    Type: AWS::Serverless::Function\n    Properties:\n      CodeUri: \.\/\n      Handler: consumer.handler)$/m,
      replacement: `  ${options.lambdaConsumer}$2`
    }, {
      regexp: /^(            - lambda:InvokeFunction\n            Resource: !GetAtt )(.*)$/m,
      replacement: `$1${options.lambdaWorker}.Arn`
    }, {
      regexp: /^(  .*)(:\n    Type: AWS::Serverless::Function\n    Properties:\n      CodeUri: \.\/\n      Handler: worker.handler)$/m,
      replacement: `  ${options.lambdaWorker}$2`
    }, {
      regexp: /^(          WORKER_LAMBDA_NAME: !Ref )(.*)$/gm,
      replacement: `$1${options.lambdaWorker}`
    }]
  );
}

function setupQuestions() {
  if (!program.region || !availableRegions.includes(program.region)) {
    questions.push({
      type: 'list',
      name: 'region',
      default: availableRegions,
      choices: availableRegions,
      message: 'Select an AWS Region:'
    });
  } else {
    options.region = program.region;
  }

  if (!program.account || program.account.length !== 12) {
    questions.push({
      type: 'input',
      name: 'account',
      message: 'Supply a 12-digit AWS Account ID:',
      validate: (v) => {
        if ((/^\w{12}$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid 12 digit AWS account';
        }
      }
    });
  } else {
    options.account = program.account;
  }

  if (!program.stack) {
    questions.push({
      type: 'input',
      name: 'stack',
      message: 'Enter a CloudFormation Stack name:',
      default: 'EventLogLambdaStack',
      validate: (v) => {
        if ((/^[a-zA-Z][a-zA-Z0-9]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid bucket name. Only alphanumeric are allowed.'
        }
      }
    });
  } else {
    options.stack = program.stack;
  }


  if (!program.bucket) {
    questions.push({
      type: 'input',
      name: 'bucket',
      message: 'Enter a unique AWS S3 Bucket name:',
      default: 'event-log-bucket',
      validate: (v) => {
        if ((/^[a-z0-9_/-]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid bucket name. Only lowercase alphanumeric, underscore, and dash are allowed.'
        }
      }
    });
  } else {
    options.bucket = program.bucket;
  }

  if (!program.task) {
    questions.push({
      type: 'input',
      name: 'task',
      message: 'Enter the AWS SQS Task Queue name:',
      default: 'EventLogTask',
      validate: (v) => {
        if ((/^[a-zA-Z][a-zA-Z0-9]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid queue name. Only alphanumeric are allowed and must not start with a number.'
        }
      }
    });
  } else {
    options.sqsTaskQueue = program.task;
  }

  if (!program.deadletter) {
    questions.push({
      type: 'input',
      name: 'deadletter',
      message: 'Enter the AWS SQS Deadletter Queue name:',
      default: 'EventLogDeadLetter',
      validate: (v) => {
        if ((/^[a-zA-Z][a-zA-Z0-9]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid queue name. Only alphanumeric are allowed and must not start with a number.'
        }
      }
    });
  } else {
    options.sqsDeadLetterQueue = program.deadletter;
  }

  if (!program.consumer) {
    questions.push({
      type: 'input',
      name: 'consumer',
      message: 'Enter the AWS Lambda Consumer function name:',
      default: 'EventLogConsumer',
      validate: (v) => {
        if ((/^[a-zA-Z][a-zA-Z0-9]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid function name. Only alphanumeric are allowed and must not start with a number.'
        }
      }
    });
  } else {
    options.lambdaConsumer = program.consumer;
  }

  if (!program.worker) {
    questions.push({
      type: 'input',
      name: 'worker',
      message: 'Enter the AWS Lambda Worker function name:',
      default: 'EventLogWorker',
      validate: (v) => {
        if ((/^[a-zA-Z][a-zA-Z0-9]*$/).test(v)) {
          return true;
        } else {
          return 'Must be a valid function name. Only alphanumeric are allowed and must not start with a number.'
        }
      }
    });
  } else {
    options.lambdaWorker = program.worker;
  }
}

function mapAnswers(answers) {
  if (answers.region) { options.region = answers.region; }
  if (answers.account) { options.account = answers.account; }
  if (answers.stack) { options.cfstack = answers.stack; }
  if (answers.bucket) { options.bucket = answers.bucket; }
  if (answers.task) { options.sqsTaskQueue = answers.task; }
  if (answers.deadletter) { options.sqsDeadLetterQueue = answers.deadletter; }
  if (answers.consumer) { options.lambdaConsumer = answers.consumer; }
  if (answers.worker) { options.lambdaWorker = answers.worker; }
}

function doConfig() {
  setupQuestions();
  if (questions.length !== 0) {
    inquirer.prompt(questions)
    .then((answers) => {
      mapAnswers(answers);
      performModify();
    })
    .catch((err) => {
      console.error(err.stack || err);
    });
  } else {
    performModify();
  }
}

program
  .version(pack.version)
  .option('-a, --account <accountID>','The AWS Account ID to use.')
  .option('-b, --bucket <bucketName>', 'The S3 Bucket Name to configure and use.')
  .option(
    '-c, --consumer <functionName>',
    'The name of the Consumer Lambda function to configure and use. Defaults to "EventLogConsumerLambda"')
  .option(
    '-d, --deadletter <queueName>',
    'The name of the Deadletter queue to configure and use. Defaults to "EventLogDeadLetter"')
  .option('-f, --force', 'Do not ask for confirmation')
  .option('-r, --region <awsRegion>', 'The AWS region to use. Defaults to "us-east-1"')
  .option(
    '-s, --stack <stackName>',
    'The name of the CloudFormation stack to configure and use. Defaults to "EventLogLambdaStack"')
  .option(
    '-t, --task <queueName>',
    'The name of the Task queue to configure and use. Defaults to "EventLogTask"')
  .option(
    '-w, --worker <functionName>',
    'The name of the Worker Lambda function to configure and use. Defaults to "EventLogWorkerLambda"')
  .parse(process.argv);

if (program.force === true) {
  doConfig();
} else {
  inquirer.prompt([
    {
      type: 'confirm',
      name: 'ok',
      default: false,
      message: 'You are about to destroy the current aws configuration. Are you sure?'
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
}
