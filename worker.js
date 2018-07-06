const __ = require('@dealerslink/lodash-extended');
const AWS = require('aws-sdk');
const Mailer = require('./lib/mailer');
const config = require('./config/config');

const TASK_QUEUE_URL = process.env.TASK_QUEUE_URL;
const AWS_REGION = process.env.AWS_REGION;

const sqs = new AWS.SQS({ region: AWS_REGION });

class Worker {
  constructor(event, context, callback, options) {
    this.options = __.merge({ ignoreQueue: false }, options || {});
    this.event = event;
    this.context = context;
    this.callback = callback;
    this.missingFields = [];
    this.errorState = false;
    this.mailer = new Mailer(config);
  }

  // Fixes UUIDs originating from ColdFusion to standard formatting
  scrubUUID(uuid) {
    if (uuid.length === 35) {
      // Of the form -- 7BBD3527-AE69-6855-27473B61228E264D
      return `${uuid.substr(0,23)}-${uuid.substr(23,35)}`;
    }
    return uuid;
  }

  // Fixes non-standard compliant variable names and odd JSON formatting
  scrubJSONData(data) {
    data = data.replace(/" : /g, '": ');
    // data = data.replace(/"eventId"/g, '"eventID"');
    return data;
  }

  fieldCheck(obj, fields) {
    let ret = true;
    fields.forEach((key) => {
      let test = __.hasValue(obj[key]);
      if (!test) { this.missingFields.push(key); }
      ret = ret && test;
    });
    return ret;
  }

  work(done) {
    let obj = {};
    // Check the event payload exists
    const body = this.event.Body;
    if (body) {
      // validate that the data lints
      try {
        let data = this.scrubJSONData(this.event.Body);
        obj = JSON.parse(data);
      } catch (ex) {
        this.errorState = true;
        return done(ex);
      }

      // Check that the data has required fields (mail, timestamp, etc.)
      const eventFields = ['mailID', 'mailTimestamp', 'from', 'to', 'subject', 'body'];
      if (!this.fieldCheck(obj, eventFields)) {
        this.errorState = true;
        return done(new Error(`Missing required fields: ${this.missingFields.join(', ')}`))
      }

      const uuid = this.scrubUUID(obj.mailID);

      // Attempt mail delivery
      this.mailer.dispatch(obj.to, obj.from, obj.subject, obj.body)
        .then((result) => {
          done();
        })
        .catch((err) => {
          let msg = err.message || err || '';
          console.log(msg);
          console.log(err);
          this.errorState = true;
          done(err);
        });
    } else {
      done(new Error('Queue Message Body is empty, nothing to do'));
    }
  }

  deleteMessage(error) {
    if (error) {
      console.log(error.stack || error);
    }

    if (!this.options.ignoreQueue) {
      console.log('Deleting Message');
      let obj = {
        ReceiptHandle: this.event.ReceiptHandle,
        QueueUrl: TASK_QUEUE_URL
      };
      console.log(obj);
      try {
        console.log('Sending Delete Request');
        let sqsDeleteReq = sqs.deleteMessage(obj, (err, data) => {
          if (err) {
            console.log(`Deletion Error -- ${err}`);
            console.log(err);
            this.callback(err);
          } else {
            console.log(`Message Deleted -- ${data}`);
            if (error) {
              this.callback(error);
            } else {
              this.callback();
            }
          }
        });
      } catch (err) {
        console.log('Fatal Error during deletion');
        console.log(err.stack || err);
        this.callback(err);
      }
    } else {
      console.log('Skip Message Delete');
    }
  }

  startup() {
    this.work((err) => {
      // Ensure that erroring messages are not removed from the queue so they end up in the dead-letter
      if (!this.errorState) {
        this.deleteMessage(err);
      } else {
        // Some error occurred skip deletion of message
        if (err) {
          this.callback(err);
        } else {
          this.callback();
        }
      }
    });
  }
}

exports.handler = function(event, context, callback, options) {
  const worker = new Worker(event, context, callback, options);
  worker.startup();
};

exports.close = function() {
  close(0);
};

// --------------------------------------------------------------------------------------------------------------------
// Local Shutdown Code -- When debugging locally
// --------------------------------------------------------------------------------------------------------------------
function close(code) {
  let sigCode;
  code = code || 0;
  switch (code) {
    case 2:
      sigCode = 'SIGINT';
      break;
    case 15:
      sigCode = 'SIGTERM';
      break;
    default:
      sigCode = code;
      break;
  }

  // Perform gracful shutdown here
  console.log(`Received exit code ${sigCode}, performing graceful shutdown`);
  // if (!__.isNull(dbconn) && !__.isUndefined(dbconn)) {
  //   dbconn.close();
  // }
  // Shutdown the server
  // End the process after allowing time to close cleanly
  setTimeout(
    (errCode) => {
      process.exit(errCode);
    },
    1000,
    code
  );
}

// Event handlers for CTRL+C and kill pid
process.on('SIGTERM', () => { close(15); });
process.on('SIGINT', () => { close(2); });
