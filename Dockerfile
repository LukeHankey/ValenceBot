FROM node:18.13.0 as base

WORKDIR /project

COPY . .

RUN npm install

FROM base as production

RUN adduser -h /home/prod/ -s /bin/bash -D prod && chown -R prod:prod /project
USER prod

CMD ["run start"]
ENTRYPOINT ["npm"]
