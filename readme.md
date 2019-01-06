# Frontend

Static resources and frontend code for Cash Track web interface.

## Local

```bash
$ ./cmd npm run dev
$
$ ./cmd yarn // install dependencies
$ ./cmd yarn run dev
```

## Push to registry

```bash
$ docker build . -t cashtrack/frontend:latest --no-cache
$ docker push cashtrack/frontend:latest
```