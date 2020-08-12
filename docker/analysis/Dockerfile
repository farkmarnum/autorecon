# Install nmap and node
FROM alpine:3.12 as install_tools
ENV NODE_VERSION 12.18.3-r0
RUN apk add --update --no-cache nodejs==${NODE_VERSION} npm==${NODE_VERSION}

# Build code
FROM node as build
WORKDIR /opt
ENV REPO_SRC https://github.com/farkmarnum/autorecon.git
# don't cache this part:
ARG CACHEBUST=1
RUN git clone ${REPO_SRC} && cd autorecon && npm i && npm run build

# Run
FROM install_tools as prod
COPY --from=build /opt/autorecon /opt/autorecon
WORKDIR /opt/autorecon
RUN npm i --production

CMD ["node", "./dist/analyze.js"]