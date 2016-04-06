## About
The BlueChatter app is a very simple chat/IRC type app for your browser.
It is very basic, you just go to the app, enter a user name and start
chatting.

For a demonstration of this application you can watch the following
YouTube video.

[![BlueChatter](https://img.youtube.com/vi/i7_dQQy40ZQ/0.jpg?time=1398101975441)](http://youtu.be/i7_dQQy40ZQ)


## Technologies
BlueChatter uses [Node.js](http://nodejs.org/) and
[Express](http://expressjs.com/) for the server.  On the frontend
BlueChatter uses [Bootstrap](http://getbootstrap.com/) and
[JQuery](http://jquery.com/).  The interesting part of this application
is how the communication of messages is done.  The application uses [long
polling](http://en.wikipedia.org/wiki/Push_technology#Long_polling) to enable
the clients (browsers) to listen for new messages.  Once the
app loads a client issues a request to the server.  The server waits to respond
to the request until it receives a message.  If no message is received from any
of the chat participants it responds back to the client with a 204 - no content.
As soon as the client gets a response from the server, regardless of whether that
response contains a message or not, the client will issue another request and
the process continues.

One of the goals of this application is to demonstrate scaling in Bluemix.
As we know when you scale an application in Bluemix you essentially are
creating multiple instance of the same application which users will connect
to at random.  In other words there are multiple BlueChatter servers running
at the same time.  So how do we communicate chat messages between the servers?
We use the [pubsub feature of Redis](http://redis.io/topics/pubsub) to solve
this.  All servers bind to a single
Redis instance and each server is listening for messages on the same channel.
When one chat server receives a chat message it publishes an event to Redis
containing the message.  The other servers then get notifications of the new
messages and notify their clients of the.  This design allows BlueChatter to
scale nicely to meet the demand of its users.

## Deploying To Bluemix

The easiest way to deploy BlueChatter is to click the "Deploy to Bluemix"
button below.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/IBM-Bluemix/bluechatter)

Using the Deploy To Blumix button will automatically setup several things for you.  
First it will create a Git repo in IBM DevOps Services containing the code for the applicaiton.
In addition a deployment pipeline will automatically be setup and run which will deploy the
application to Bluemix for you.  The deployment pipeline will both deploy the application as a
Cloud Foundry application and in a Docker container.  Both versions of the application will
share the same route (URL) in Bluemix so hitting that URL you will either be using the Cloud
Foundry application or the Docker container.  In addition to deploying the app using Cloud
Foundry and Docker the pipeline will build a Docker image and place it in your Docker
registry on Bluemix so you can deploy additional containers based on that image if you want.


### Using The Command Line
Make sure you have the Cloud Foundry Command Line installed and you
are logged in.

    $ cf login -a https://api.ng.bluemix.net

Next you need to create a Redis service for the app to use.  Lets use the RedisCloud service.

    $ cf create-service rediscloud 30mb redis-chatter

### Using The Cloud Foundry CLI

Now just push the app, we have a manifest.yml file so the command
is very simple.

    $ git clone https://github.com/IBM-Bluemix/bluechatter.git
	$ cd bluechatter
    $ cf push my-bluemix-chatter-app-name


## Scaling The App

Since we are using Redis to send chat messages, you can scale this application
as much as you would like and people can be connecting to various servers
and still receive chat messages.  To scale you app you can run the following
command.

    $ cf scale my-blue-chatter-app-name -i 5

Then check your that all your instances are up and running.

    $ cf app my-blue-chatter-app-name

When you connect to app you can see which instance you are connecting to
in the footer of the application.  If you have more than one instance
running chances are the instance id will be different between two different
browsers.

### Docker

BlueChatter can be run inside a Docker container locally or in the
IBM Containers Service in Bluemix.

#### Running In A Docker Container Locally

To run locally you must have Docker and Docker Compose installed locally.
If you are using OSX or Windows, both should be installed by default
when you install [Docker Toolbox](https://www.docker.com/toolbox).  For
Linux users follow the [instructions](https://docs.docker.com/compose/install/)
on the Docker site.

Once you have Docker and Docker Compose installed run the following commands
from the application root to start the BlueChatter application.

```
$ docker-compose build
$ docker-compose up
```
On OSX and Windows you will need the IP address of your Docker Machine VM to test the application.
Run the following command, replacing `machine-name` with the name of your Docker Machine.

```
$ docker-machine ip machine-name
```
Now that you have the IP go to your favorite browser and enter the IP in the address bar,
you should see the app come up.  (The app is running on port 80 in the container.)

On Linux you can just go to [http://localhost](http://localhost).

#### Running The Container On Bluemix

Before running the container on Bluemix you need to have gone through the steps to setup
the IBM Container service on Bluemix.  Please review the
[documentation](https://www.ng.bluemix.net/docs/containers/container_index.html) on Bluemix before
continuing.

The following instruction assume you are using the [Cloud Foundry
CLI IBM Containers Plugin](https://www.ng.bluemix.net/docs/containers/container_cli_cfic.html#container_cli_cfic_install).
If you are not using the plugin, execute the equivalent commands for your CLI solution.

Make sure you are logged into Bluemix from the Cloud Foundry CLI and the IBM Containers plugin.

```
$ cf login -a api.ng.bluemix.net
$ cf ic login
```

After you have logged in you can build an image for the BlueChatter application on Bluemix.
From the root of BlueChatter application run the following commnand replacing namespace
with your namespace for the IBM Containers service.  (If you don't know what your namespace is
run `$ cf ic namespace get`.)

```
$ cf ic build -t namespace/bluechatter ./
```

The above `build` command will push the code for Bluechatter to the IBM Containers Docker service
and run a `docker build` on that code.  Once the build finishes the resulting image will be
deployed to your Docker registry on Bluemix.  You can verify this by running

```
$ cf ic images
```

You should see a new image with the tag `namespace/bluechatter` listed in the images available to you.
You can also verify this by going to the [catalog](https://console.ng.bluemix.net/catalog/) on Bluemix,
in the containers section you should see the BlueChatter image listed.

Before you can start a container from the image we are going to need a Redis service for our container to use.
To do this in Bluemix we will need what is called a "bridge app".  Follow the [
instructions](https://www.ng.bluemix.net/docs/containers/container_binding_ov.html#container_binding_ui) on
Bluemix for how to create a bridge app from the UI.  Make sure you bind a
[Redis Cloud](https://console.ng.bluemix.net/catalog/redis-cloud/) service to the bridge
app and name it "redis-chatter".

Once your bridge app is created follow the
[instructions](https://www.ng.bluemix.net/docs/containers/container_single_ov.html#container_single_ui)
on Bluemix for deploying a container based on the BlueChatter image.  Make sure you request a public IP
address, expose port 80, and bind to the bridge app you created earlier.  Once your container starts you
go to the public IP address assigned to the app in your browser and you should see the BlueChatter UI.

#### Deploy To Bluemix With Docker Compose
In addition to using a cloud hosted Redis service like RedisCloud on Bluemix,
you can choose to have BlueChatter use your own container running Redis.  The easiest way to do this is to use Docker Compose.  Below are a few simple steps to easily deploy BlueChatter and Redis using Docker Compose.

First you will have to pull the [Redis image](https://hub.docker.com/_/redis/) from Docker
Hub into your private registry on Bluemix.  To do this run

```
$ cf ic cpi redis registry.ng.bluemix.net/<my_namespace>/redis
```
Make sure you replace `my_namespace` in the URL above with your IBM Containers
namespace from Bluemix.

In order to use the Docker Compose CLI commands with IBM Containers in Bluemix
you need to configure your Docker CLI to point to the IBM Containers service
on Bluemix.  To do this run `cf ic login` and follow the steps in "Option 2" to
use the Docker CLI.

Next create a new Docker Compose file called `docker-compose-bluemix.yml` and
add the following YAML.

```
web:
  image: registry.ng.bluemix.net/<my_namespace>/bluechatter
  ports:
    - "80"
  links:
    - redis
  mem_limit: 512
  environment:
    - "LOG_LOCATIONS=/var/log/dpkg.log"
redis:
  image: registry.ng.bluemix.net/<my_namespace>/redis
  ports:
    - "6379"
  mem_limit: 128
```

Again make sure you replace `my_namespace` with your IBM Containers namespace.

If you have not yet pushed the BlueChatter Docker image to Bluemix than you should
do that now, run

```
$ cf ic build -t my_namespace/bluechatter ./
```
Finally you can run `docker-compose -f docker-compose-bluemix.yml up -d --force-recreate` to
create, start, and run both containers.

Now that the containers are running you need to bind a public IP address to the
BlueChatter container in order to access the web app from the browser.  
First request a public IP if you don't already have one to use.

```
$ cf ic ip request
```

Then bind that IP to the BlueChatter container.

```
$ cf ic ip bind <IP> <container_name_or_ID>
```

After your IP is bound you should be able to go to that IP on port 80 and try
out the app.  For more information on requesting and binding IPs see the
[Bluemix Documentation](https://console.ng.bluemix.net/docs/containers/container_creating_ov.html#container_cli_ips_ov).

For additional information about using Docker Compose with IBM Containers see
the [Bluemix documentation](https://console.ng.bluemix.net/docs/containers/container_creating_ov.html#container_compose_ov).

## Testing

After the app is deployed you can test it by opening two different browsers
and navigating to the URL of the app.  YOU MUST USE TWO DIFFERENT BROWSERS
AND NOT TWO TABS IN THE SAME BROWSER.  Since we are using long polling
browsers will not actually make the same request to the same endpoint
while one request is still pending.  You can also open the app in a browser
on your mobile device and try it there as well.

## License

This code is licensed under Apache v2.  See the LICENSE file in the root of
the repository.

## Dependencies

For a list of 3rd party dependencies that are used see the package.json file
in the root of the repository.
