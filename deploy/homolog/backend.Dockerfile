# syntax=docker/dockerfile:1
FROM node:24.22.1-bookworm-slim AS base
WORKDIR /app
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then \
      printf 'Acquire::https::CaInfo "/run/secrets/proxy_ca";\n' > /tmp/apt-ca.conf; \
      export APT_CONFIG=/tmp/apt-ca.conf; \
    fi; \
    apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* /tmp/apt-ca.conf && chown node:node /app

FROM base AS build
COPY --chown=node:node backend/ ./
COPY --chown=node:node deploy/homolog/bootstrap.mjs deploy/homolog/runtime-grants.sql ./deploy/homolog/
USER node
RUN --mount=type=secret,id=proxy_ca,uid=1000,gid=1000 \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --strict-ssl=true --cache /tmp/npm-cache \
    && DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run prisma:generate \
    && DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build npm run prisma:validate \
    && npm run build && rm -rf /tmp/npm-cache

FROM build AS runtime
# Prisma CLI/tsx ficam disponíveis para o job prepare; a mesma imagem inicia a API.
USER node
CMD ["npm", "start"]
