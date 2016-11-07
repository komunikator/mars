FROM node:6-onbuild

# Create app directory
RUN mkdir -p /src/app
WORKDIR /src/app

# Bundle app source
COPY / /src/app
RUN npm install

EXPOSE 8000
CMD [ "npm", "start" ]