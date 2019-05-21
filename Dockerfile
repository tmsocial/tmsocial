FROM node:12-alpine

RUN apk add --no-cache --update python3

COPY . /opt/tmsocial

RUN cd /opt/tmsocial/server/ ; npm install ; npm run build
RUN cd /opt/tmsocial/web_ui/ ; npm install ; npm run build

CMD ["node", "/opt/tmsocial/server/dist/index.js"]
