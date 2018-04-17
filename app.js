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
var cfenv = require("cfenv");
var pkg   = require("./package.json");
var redis = require('redis');
var nconf = require('nconf');
const { URL } = require('url');

var appEnv = cfenv.getAppEnv();
nconf.env();
var isDocker = nconf.get('DOCKER') == 'true' ? true : false;
var clients = [];

var app = express();
app.set('port', appEnv.port || 3000);
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Start by setting basic 'local' credentials:

if(isDocker) {
    credentials = {"hostname":"redis", "port":6379};
} else {
    credentials = {"hostname":"127.0.0.1", "port":6379};
}

// Look in VCAP_SERVICES for one or other type of Redis service, and pull it's credentials:

var connectionString;
if (process.env.VCAP_SERVICES) {
    var env = JSON.parse(process.env.VCAP_SERVICES);
    console.log('Looking for compose-for-redis credentials...');
    if (env['compose-for-redis']) {
        connectionString = env['compose-for-redis'][0]['credentials']['uri'];
        url_hostname = new URL(connectionString).hostname;
        url_port = new URL(connectionString).port;
        credentials = {"hostname":url_hostname, "port":url_port};
    } else {
        console.log('There appears to be no compose-for-redis service bound to this application.');
        console.log('Looking for rediscloud credentials...');
        if (env['rediscloud']) {
            credentials = env['rediscloud'][0]['credentials'];
        } else {
            console.log('There appears to be no redis-cloud service bound to this application.');
        }
    }
} else if (process.env.COMPOSE_REDIS_URI) {
  connectionString = process.env.COMPOSE_REDIS_URI
  url_hostname = new URL(connectionString).hostname
  url_port = new URL(connectionString).port
  password = new URL(connectionString).password

  credentials = {"hostname": url_hostname, "port": url_port, "password": password};
}

// We need two Redis clients - one to listen for events, and one to publish events.
// The way we call redis.createClient() will depend on how we got on above:

if(connectionString != null) {
    if(connectionString.includes("rediss")) {
        var subscriber = redis.createClient(connectionString,
                  { tls: { servername: new URL(connectionString).hostname} }
        );
        var publisher = redis.createClient(connectionString,
                  { tls: { servername: new URL(connectionString).hostname} }
        );
    } else {
        var subscriber = redis.createClient(connectionString);
        var publisher = redis.createClient(connectionString)
    }
} else {
    var subscriber = redis.createClient(credentials.port, credentials.hostname);
    var publisher = redis.createClient(credentials.port, credentials.hostname);
}

subscriber.on('error', function(err) {
  if (isDocker && err.message.match('getaddrinfo EAI_AGAIN')) {
    console.log('Waiting for IBM Containers networking to be available...')
    return
  }
  console.error('There was an error with the subscriber redis client ' + err);
});
subscriber.on('connect', function() {
  console.log('The subscriber redis client has connected!');

  subscriber.on('message', function(channel, msg) {
    if(channel === 'chatter') {
      while(clients.length > 0) {
        var client = clients.pop();
        client.end(msg);
      }
    }
  });
  subscriber.subscribe('chatter');
});

publisher.on('error', function(err) {
  if (isDocker && err.message.match('getaddrinfo EAI_AGAIN')) {
    console.log('Waiting for IBM Containers networking to be available...')
    return
  }
  console.error('There was an error with the publisher redis client ' + err);
});
publisher.on('connect', function() {
  console.log('The publisher redis client has connected!');
});

if (credentials.password != '' && credentials.password != undefined) {
    subscriber.auth(credentials.password);
    publisher.auth(credentials.password);
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
  message = req.body;
  publisher.publish("chatter", JSON.stringify(message), function(err) {
    if(!err) {
      console.log('published message: ' + JSON.stringify(message));
    } else {
      console.error('error publishing message: ' + err);
    }
  });
  res.end();
});

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

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
