#!/bin/bash

REPO_SRC=https://github.com/farkmarnum/autorecon.git
CODE_PATH=/usr/src/autorepo
PM2_CONFIG=$CODE_PATH/prod.config.js

cd $LOCALREPO || exit 1

git pull $REPOSRC || exit 1

npm run build || exit 1

pm2 reload $PM2_CONFIG --update-env || exit 1
