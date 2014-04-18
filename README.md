## About
The BlueChatter app is a very simple chat/IRC type app for your browser.
It is very basic, you just go to the app, enter a user name and start
chatting.  It is using Node.js, on the backend, JQuery and Bootstrap
on the frontend, and Redis to do pubsub between the different clients
and instances.

## Deploying

First you need to create a Redis service for the app to use.

    $ cf create-service redis 100 redis-chatter

Than you can just push the app, we have a manifest.yml file so the command 
is very simple.
    
    $ git clone git@github.rtp.raleigh.ibm.com:et-dev-advocates/blue-chatter.git	
	$ cd blue-chatter
    $ cf push my-bluemix-chatter-app-name

## Scaling The App

Since we are using Redis to send chat messages, you can scale this application
as much as you would like and people can be connecting to various servers
and still receive chat messages.  To scale you app you can run the following
command.

    $ cf scale my-blue-chatter-app-name -i 5

Then check your that all your instances are up and running.

    $ cf app my-blue-chatter-app-name

## Testing

After the app is deployed you can test it by opening two different browsers
and navigating to the URL of the app.  YOU MUST USE TWO DIFFERENT BROWSERS
AND NOT TWO TABS IN THE SAME BROWSER.  Since we are using long polling
browsers will not actually make the same request to the same endpoint
while one request is still pending.  You can also open the app in a browser
on your mobile device and try it there as well.