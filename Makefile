include .env.local
export

# Local config
CONTAINER_NAME=cashtrack_frontend
CONTAINER_PORT=3001

# Deploy config
REPO=cashtrack/frontend
IMAGE_RELEASE=$(REPO):$(RELEASE_VERSION)
IMAGE_DEV=$(REPO):dev
IMAGE_LATEST=$(REPO):latest

.PHONY: build tag push start stop

build:
	docker build . -t $(IMAGE_DEV)

tag:
	docker tag $(IMAGE_DEV) $(IMAGE_RELEASE)
	docker tag $(IMAGE_DEV) $(IMAGE_LATEST)

push:
	docker push $(IMAGE_RELEASE)
	docker push $(IMAGE_LATEST)

start:
	docker run \
	  --rm \
      --name $(CONTAINER_NAME) \
      -p $(CONTAINER_PORT):80 \
      -e VUE_APP_BASE_URL=$(VUE_APP_BASE_URL) \
      -e VUE_APP_API_URL=$(VUE_APP_API_URL) \
      -e VUE_APP_WEBSITE_URL=$(VUE_APP_WEBSITE_URL) \
      -e VUE_APP_GATEWAY_URL=$(VUE_APP_GATEWAY_URL) \
      -d \
      $(IMAGE_DEV)

stop:
	docker stop $(CONTAINER_NAME)
