FROM node:12-alpine

RUN apk add --no-cache --update python3

COPY web_ui /opt/tmsocial/web_ui
COPY server /opt/tmsocial/server
COPY task_maker_wrapper /opt/tmsocial/task_maker_wrapper

RUN cd /opt/tmsocial/server/ ; npm install ; npm run build
RUN cd /opt/tmsocial/web_ui/ ; npm install ; npm run build

WORKDIR /opt/tmsocial/server
CMD ["node", "dist/index.js"]
