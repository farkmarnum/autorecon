#!/bin/bash

sudo apt update || exit 1

sudo apt install -y nmap npm || exit 1

sudo npm i -g pm2 || exit 1

sudo snap install amass || exit 1
