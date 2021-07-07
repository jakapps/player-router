#!/bin/sh
VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]');
docker build -t jakapps/player-router:${VERSION} .
