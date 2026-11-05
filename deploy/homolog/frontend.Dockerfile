# syntax=docker/dockerfile:1
FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
COPY frontend/ ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --strict-ssl=true --cache /tmp/npm-cache && npm run build && rm -rf /tmp/npm-cache

FROM nginx:1.28-alpine
COPY --chmod=644 deploy/homolog/nginx.conf /etc/nginx/nginx.conf
COPY --chmod=644 deploy/homolog/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
RUN rm -f /etc/nginx/conf.d/default.conf \
    && chmod 755 /etc/nginx/templates /etc/nginx/conf.d \
    && chown -R nginx:nginx /etc/nginx/templates /etc/nginx/conf.d /usr/share/nginx/html
USER nginx
