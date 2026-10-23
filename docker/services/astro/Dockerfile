FROM node:24.19.0-bookworm

RUN ARCH=$(uname -m) \
    && case ${ARCH} in \
         "x86_64")  FIXUID_ARCH="amd64" ;; \
         "aarch64") FIXUID_ARCH="arm64" ;; \
         "arm64")   FIXUID_ARCH="arm64" ;; \
         *)         echo "Unsupported architecture: ${ARCH}" && exit 1 ;; \
       esac \
    && curl -SsL https://github.com/boxboat/fixuid/releases/download/v0.6.0/fixuid-0.6.0-linux-${FIXUID_ARCH}.tar.gz | tar -C /usr/local/bin -xzf - \
    && chown root:root /usr/local/bin/fixuid \
    && chmod 4755 /usr/local/bin/fixuid \
    && mkdir -p /etc/fixuid \
    && printf "user: node\ngroup: node\n" > /etc/fixuid/config.yml

WORKDIR /work

RUN git config --global --add safe.directory /work

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Use fixuid as entrypoint to handle UID/GID mapping
ENTRYPOINT ["fixuid"]

CMD ["bash"]
