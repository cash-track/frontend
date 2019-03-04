FROM node:11.10-alpine AS builder

ARG APP_ENV=production
ENV APP_ENV ${APP_ENV}

COPY . /var/www/
WORKDIR /var/www/

RUN if [ $APP_ENV = "production" ] ; then \
        npm install && npm run ${APP_ENV} \
    ; fi

CMD ["npm"]

FROM nginx:1.15-alpine AS web

ADD ./config/host.conf /etc/nginx/conf.d/default.conf
RUN mkdir /var/www/public
COPY ./public /var/www/public
WORKDIR /var/www/public
COPY --from=builder /var/www/public/dist ./public/dist

EXPOSE 8082