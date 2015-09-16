FROM registry.ng.bluemix.net/ibmnode:latest
COPY ./ bluechatter
RUN npm install -g node-inspector
WORKDIR bluechatter
RUN npm install -d --production
EXPOSE 80
EXPOSE 8080
EXPOSE 5858
ENV PORT 80
ENV DOCKER true
#CMD ["./debug.sh"]
CMD ["node", "app.js"]