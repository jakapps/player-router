FROM mhart/alpine-node

COPY package.json /
COPY tsconfig.json /
COPY src src

RUN npm install
RUN node_modules/typescript/bin/tsc

FROM mhart/alpine-node

COPY --from=0 node_modules node_modules
COPY --from=0 package.json /
COPY --from=0 dist/ /

RUN npm install pm2 -g

expose 8090
expose 3002
expose 3003

ENTRYPOINT ["pm2-runtime", "index.js"]
