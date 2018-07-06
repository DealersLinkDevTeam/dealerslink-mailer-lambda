const worker = require('./worker');

let testData = {
  "mailID" : "7BBD3527-AE69-6855-27473B61228E264D",
  "mailTimestamp" : "2018-03-29T17:20:35",
	"to" : "dev@dealerslink.com",
	"from" : "dev@dealerslink.com",
  "subject": "Test Email",
  "body": "Test Body",
};

let data = JSON.stringify(testData);
worker.handler({ Body: data }, null, (res) => { if (res) { console.log(res); } worker.close(); }, { ignoreQueue: true });
