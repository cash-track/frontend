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

# Release metadata, injected by entrypoint.sh into the SPA at container start (never
# baked into the Vite build — config is deliberately resolved at runtime, see env.ts).
ARG GIT_TAG=""
ARG GIT_COMMIT=""
ENV VITE_APP_VERSION=${GIT_TAG}
ENV VITE_APP_COMMIT=${GIT_COMMIT}

COPY --from=build-stage /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

COPY entrypoint.sh /usr/share/nginx/

ENTRYPOINT ["/usr/share/nginx/entrypoint.sh"]

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
