#!/usr/bin/env node

const inquirer = require('inquirer');
const modifyFiles = require('./utils')
const packageJson = require('../package.json')
const config = packageJson.config

const defaults = {
  region: 'YOUR_AWS_REGION',
  account: 'YOUR_ACCOUNT_ID',
  cfstack: 'YOUR_CLOUDFORMATION_STACK_NAME',
  bucket: 'YOUR_UNIQUE_BUCKET_NAME',
  sqsTaskQueue: 'YOUR_SQS_TASK_NAME',
  sqsDeadLetterQueue: 'YOUR_SQS_DEAD_LETTER_NAME',
  lambdaConsumer: 'YOUR_LAMBDA_CONSUMER_FUNCTION_NAME',
  lambdaWorker: 'YOUR_LAMBDA_WORKER_FUNCTION_NAME'
};

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
    modifyFiles(['./package.json'],
      [{
        regexp: /("region": )"([A-Za-z0-9_-]*)",/,
        replacement: `$1"${defaults.region}",`
      }, {
        regexp: /("accountId": )"(\w*)",/,
        replacement: `$1"${defaults.account}",`
      }, {
        regexp: /("cloudFormationStackName": )"([A-Za-z0-9_-]*)",/,
        replacement: `$1"${defaults.cfstack}",`
      }, {
        regexp: /("s3BucketName": )"([A-Za-z0-9_-]*)",/,
        replacement: `$1"${defaults.bucket}",`
      }, {
        regexp: /("sqsTaskName": )"([A-Za-z0-9_-]*)",/,
        replacement: `$1"${defaults.sqsTaskQueue}",`
      }, {
        regexp: /("sqsDeadLetterName": )"([A-Za-z0-9_-]*)",/,
        replacement: `$1"${defaults.sqsDeadLetterQueue}",`
      }, {
        regexp: /("lambdaConsumerFunctionName": )"([A-Za-z0-9_-]*)",/,
        replacement: `$1"${defaults.lambdaConsumer}",`
      }, {
        regexp: /("lambdaWorkerFunctionName": )"([A-Za-z0-9_-]*)"/,
        replacement: `$1"${defaults.lambdaWorker}"`
      }]
    );

    modifyFiles(['./cloudformation.yaml'],
      [{
        regexp: /^(Resources:\n  )(\w*):$/m,
        replacement: `$1${defaults.sqsTaskQueue}:`
      }, {
        regexp: /^(            - sqs:ReceiveMessage\n            Resource: !GetAtt )(.*)$/m,
        replacement: `$1${defaults.sqsTaskQueue}.Arn`
      }, {
        regexp: /^(          TASK_QUEUE_URL: !Ref )(.*)$/gm,
        replacement: `$1${defaults.sqsTaskQueue}`
      }, {
        regexp: /^(            - sqs:DeleteMessage\n            Resource: !GetAtt )(.*)$/m,
        replacement: `$1${defaults.sqsTaskQueue}.Arn`
      }, {
        regexp: /^(        maxReceiveCount: 10\n  )(.*):$/m,
        replacement: `$1${defaults.sqsDeadLetterQueue}:`
      }, {
        regexp: /^(      deadLetterTargetArn: !GetAtt )(.*)$/m,
        replacement: `$1${defaults.sqsDeadLetterQueue}.Arn`
      }, {
        regexp: /^(  .*)(:\n    Type: AWS::Serverless::Function\n    Properties:\n      CodeUri: \.\/\n      Handler: consumer.handler)$/m,
        replacement: `  ${defaults.lambdaConsumer}$2`
      }, {
        regexp: /^(            - lambda:InvokeFunction\n            Resource: !GetAtt )(.*)$/m,
        replacement: `$1${defaults.lambdaWorker}.Arn`
      }, {
        regexp: /^(  .*)(:\n    Type: AWS::Serverless::Function\n    Properties:\n      CodeUri: \.\/\n      Handler: worker.handler)$/m,
        replacement: `  ${defaults.lambdaWorker}$2`
      }, {
        regexp: /^(          WORKER_LAMBDA_NAME: !Ref )(.*)$/gm,
        replacement: `$1${defaults.lambdaWorker}`
      }]
    );
  } else {
    console.log('Operation aborted');
  }
})
.catch((err) => {
  console.error(err.stack || err);
});
