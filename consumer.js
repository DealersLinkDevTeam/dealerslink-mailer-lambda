const AWS = require('aws-sdk');
const async = require('async');

const TASK_QUEUE_URL = process.env.TASK_QUEUE_URL;
const WORKER_LAMBDA_NAME = process.env.WORKER_LAMBDA_NAME;
const AWS_REGION = process.env.AWS_REGION;

const sqs = new AWS.SQS({ region: AWS_REGION });
const lambda = new AWS.Lambda({ region: AWS_REGION });

function receiveMessages(callback) {
  const params = { QueueUrl: TASK_QUEUE_URL, MaxNumberOfMessages: 10 };
  sqs.receiveMessage(params, (err, data) => {
    if (err) {
      console.error(err, err.stack);
      callback(err);
    } else {
      callback(null, data.Messages);
    }
  });
}

function invokeWorkerLambda(task, callback) {
  const params = { FunctionName: WORKER_LAMBDA_NAME, InvocationType: 'Event', Payload: JSON.stringify(task) };
  lambda.invoke(params, (err, data) => {
    if (err) {
      console.error(err, err.stack);
      callback(err);
    } else {
      callback(null, data);
    }
  });
}

function handleSQSMessages(context, callback) {
  receiveMessages((err, messages) => {
    // If there are messages in the queue and the queue length is greater than 0
    if (messages && messages.length > 0) {
      const invocations = [];
      messages.forEach((message) => {
        // Push all messages into an array as a function to be invoked later
        invocations.push((cb) => {
          invokeWorkerLambda(message, cb);
        });
      });
      // Invoke all messages in the array (this only kicks off the tasks in parallel, they are run in series and the callback occurs when completed or error)
      async.parallel(invocations, (er) => {
        if (er) {
          console.error(er, er.stack);
          callback(er);
        } else if (context.getRemainingTimeInMillis() > 20000) {
          // If there is more time remaining, check the queue again and repeat the process
          handleSQSMessages(context, callback);
        } else {
          callback(null, 'PAUSE');
        }
      });
    } else {
      callback(null, 'DONE');
    }
  });
}

exports.handler = function(event, context, callback) {
  handleSQSMessages(context, callback);
};
