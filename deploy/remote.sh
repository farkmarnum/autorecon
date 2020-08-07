#!/bin/bash

REPO_SRC=https://github.com/farkmarnum/autorecon.git
CODE_PATH=/usr/src/autorepo
PM2_CONFIG=$CODE_PATH/prod.config.js

cd $CODE_PATH || exit 1

git pull $REPO_SRC || exit 1

npm run build || exit 1

pm2 reload $PM2_CONFIG --update-env || exit 1
