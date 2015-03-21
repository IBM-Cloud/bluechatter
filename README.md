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

One of the goals of this application is to demonstrate scaling in BlueMix.
As we know when you scale an application in BlueMix you essentially are
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

## Deploying To BlueMix

The easiest way to deploy BlueChatter is to click the "Deploy to Bluemix"
button below.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/IBM-Bluemix/bluechatter)

### Using The Command Line
Make sure you have the Cloud Foundry Command Line installed and you
are logged in.

    $ cf login -a https://api.ng.bluemix.net

Next you need to create a Redis service for the app to use.  Lets use the RedisCloud service.

    $ cf create-service rediscloud 25mb redis-chatter

### Using The Cloud Foundry CLI

Now just push the app, we have a manifest.yml file so the command 
is very simple.
    
    $ git clone https://github.com/CodenameBlueMix/bluechatter.git	
	$ cd bluechatter
    $ cf push my-bluemix-chatter-app-name

### Using IBM DevOps Services (JazzHub)
If you would like you can also deploy the project to BlueMix using
IBM's DevOps Services (JazzHub).  You can find the project 
[here](https://hub.jazz.net/project/rjbaxter/bluechatter/overview) on
JazzHub.  To deploy you will need to login to JazzHub. Then click
Edit Code in the upper right hand corner.  In the editor click the 
Deploy button in the toolbar.

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
