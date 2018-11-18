FROM node:11.1.0-alpine AS builder

ARG APP_ENV=production
ENV APP_ENV ${APP_ENV}

COPY . /var/www/
WORKDIR /var/www/

RUN npm install && npm run ${APP_ENV}

FROM nginx:1.15.6-alpine AS web

ADD ./config/host.conf /etc/nginx/conf.d/default.conf
COPY . /var/www/
WORKDIR /var/www/
COPY --from=builder /var/www/public/dist ./public/dist

EXPOSE 8082