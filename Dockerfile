FROM ubuntu:19.04

RUN true \
    && apt-get -y update \
    && apt-get -y upgrade \
    && apt-get -y install g++ gcc git cmake make libdw-dev \
                   python3 python3-setuptools python3-pip \
                   python3-traits python3-ruamel.yaml python3-pytoml \
                   fp-compiler rustc zip npm curl \
    && apt-get -y clean 

RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get -y update && apt-get install -y nodejs && apt-get -y clean

RUN true \
    && mkdir -p /tmp/hunter-root \
    && git clone https://github.com/tmsocial/task-maker /tmp/task-maker \
    && cd /tmp/task-maker \
    && mkdir build/ && cd build/ \
    && cmake .. -DHUNTER_ROOT=/tmp/hunter-root \
    && make -j8 \
    && cd python \
    && python3 setup.py install \
    && rm -rf /tmp/task-maker \
    && rm -rf /tmp/hunter-root 

COPY web_ui /opt/tmsocial/web_ui
COPY server /opt/tmsocial/server
COPY task_maker_wrapper /opt/tmsocial/task_maker_wrapper

RUN npm i npm@latest -g
RUN npm cache clean --force
RUN cd /opt/tmsocial/server/ && npm install && npm run build
RUN cd /opt/tmsocial/web_ui/ && npm install && npm run build

COPY test_site /opt/tmsocial/test_site

WORKDIR /opt/tmsocial/server
CMD ["node", "dist/index.js"]
