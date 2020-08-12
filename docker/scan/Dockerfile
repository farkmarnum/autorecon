# Build findomain
FROM alpine:3.12 as build_findomain
WORKDIR /opt
RUN apk add --update --no-cache \
  git \
  make \
  perl \
  rust \
  cargo \
  openssl-dev \
  openssl && \
  git clone https://github.com/Edu4rdSHL/findomain.git && \
  cd findomain && \
  OPENSSL_NO_VENDOR=true cargo build --release && \
  cp target/release/findomain /usr/bin

# Install nmap and node
FROM alpine:3.12 as install_tools
ENV NMAP_VERSION 7.80-r2
ENV NODE_VERSION 12.18.3-r0
RUN apk add --update --no-cache nmap==${NMAP_VERSION} nodejs==${NODE_VERSION} npm==${NODE_VERSION}
COPY --from=build_findomain /usr/bin/findomain /usr/bin/findomain

# Build code
FROM node as build
WORKDIR /opt
ENV REPO_SRC https://github.com/farkmarnum/autorecon.git
# don't cache this part:
ARG CACHEBUST=1
RUN git clone ${REPO_SRC} && cd autorecon && npm i --silent && npm run build

# Run
FROM install_tools as prod
COPY --from=build /opt/autorecon /opt/autorecon
WORKDIR /opt/autorecon
RUN npm i --silent --production

CMD ["node", "./dist/scan.js"]
