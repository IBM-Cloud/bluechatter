//------------------------------------------------------------------------------
// Copyright IBM Corp. 2015
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//------------------------------------------------------------------------------

var express = require("express");
var fs = require('fs');
var http = require('http');
var path = require('path');
var MessageHub = require('message-hub-rest');
var cfenv = require('cfenv');
var nconf = require('nconf');

var MESSAGE_HUB_TOPIC = 'kafkachatter';
var CONSUMER_GROUP_NAME = 'kafkachatter-consumers';
var CONSUMER_GROUP_INSTANCE_NAME = 'kafkachatter-consumer-1';
var clients = [];

// Initialize our appEnv object. When running locally, you can define a
// VCAP_SERVICES.json file that mirrors the VCAP_SERVICES in bluemix, if you
// do so, we will use those environment variables.
var cfenvOpts = null;
try {
  cfenvOpts = { vcap: { services: require('./VCAP_SERVICES.json') } };
} catch(e) {}; // don't do anything, just means JSON file doesnt exist
var appEnv = cfenv.getAppEnv(cfenvOpts);

// See if we're running in docker or not
nconf.env();
var isDocker = nconf.get('DOCKER') == 'true' ? true : false;

// Initialize our express server
var app = express();
app.set('port', appEnv.port || 3000);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// extract our kafka credentials - right now only works with a deployed kafka
// via the Bluemix message hub service
var kafkaService = appEnv.getService('kafka-chatter');
var messageHubInstance = new MessageHub({messagehub: [ kafkaService ]});

// initialize kafka
// first, we make sure our topic exists
var consumerInstance;
messageHubInstance.topics.get().then(function(topics) {
  if (topics.some(function(t) { return t.name === MESSAGE_HUB_TOPIC; })) {
    return true
  }
  return messageHubInstance.topics.create(MESSAGE_HUB_TOPIC);
// once our topic is initialized, we create a consumer
}).then(function() {
  console.log('topic ' + MESSAGE_HUB_TOPIC + ' initialized');
  return messageHubInstance.consume(CONSUMER_GROUP_NAME, CONSUMER_GROUP_INSTANCE_NAME, { 'auto.offset.reset': 'largest' });
// once our consumer is created, we keep a reference to it
}).then(function(response) {
  console.log('successfully created consumer ' + CONSUMER_GROUP_NAME + ':' + CONSUMER_GROUP_INSTANCE_NAME);
  consumerInstance = response[0];
}).catch(function(error) {
  console.error('error creating topic');
  console.error(error);
});

// produce and consume a message over our message hub
function produceConsume(message) {
  var list = new MessageHub.MessageList([message]);
  return messageHubInstance.produce(MESSAGE_HUB_TOPIC, list.messages).then(function(response) {
    console.log('published message: ' + JSON.stringify(message));
    return consumerInstance.get(MESSAGE_HUB_TOPIC);
  }).then(function(data) {
    var receivedMessage = data[0];
    console.log('received message: ' + receivedMessage);
    while(clients.length > 0) {
      var client = clients.pop();
      client.end(data[0]);
    }
    return true;
  }).catch(function(error) {
    console.error('error sending or receiving message');
    console.error(error);
  });
}

// Serve up our static resources
app.get('/', function(req, res) {
  fs.readFile('./public/index.html', function(err, data) {
    res.end(data);
  });
});

// Poll endpoint
app.get('/poll/*', function(req, res) {
  clients.push(res);
});

// Msg endpoint
app.post('/msg', function(req, res) {
  produceConsume(req.body);
  res.end();
});

// instanceId endpoint
var instanceId = !appEnv.isLocal ? appEnv.app.instance_id : undefined;
app.get('/instanceId', function(req, res) {
  if(!instanceId) {
    res.writeHeader(204);
    res.end();
  } else {
    res.end(JSON.stringify({
      id : instanceId
    }));
  }
});

// This interval will clean up all the clients every minute to avoid timeouts
setInterval(function() {
  while(clients.length > 0) {
    var client = clients.pop();
    client.writeHeader(204);
    client.end();
  }
}, 60000);

// start up our server
http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
