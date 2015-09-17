FROM registry.ng.bluemix.net/ibmnode:latest
COPY ./ bluechatter
WORKDIR bluechatter
RUN npm install -d --production
EXPOSE 80
ENV PORT 80
ENV DOCKER true
CMD ["node", "app.js"]

# If you would like to run node-inspector to debug the application
# Comment out the above CMD call and uncomment the below 4 lines
#RUN npm install -g node-inspector
#EXPOSE 8080
#EXPOSE 5858
#CMD ["./debug.sh"]
