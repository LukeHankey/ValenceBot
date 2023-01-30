FROM node:18.8.0 as base

WORKDIR /project

COPY . .

RUN npm install

FROM base as production

RUN useradd -ms /bin/bash prod && chown -R prod:prod /project
USER prod

CMD ["run start"]
ENTRYPOINT ["npm"]
