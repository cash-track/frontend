# build stage
FROM node:lts-alpine AS build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

ENV NODE_OPTIONS=--openssl-legacy-provider

RUN npm run build

# production stage
FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

COPY entrypoint.sh /usr/share/nginx/

ENTRYPOINT ["/usr/share/nginx/entrypoint.sh"]

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
