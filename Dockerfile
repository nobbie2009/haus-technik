FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM python:3.13-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends nginx tini \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home app \
    && mkdir -p /data && chown app:app /data
COPY --from=build /build/dist /app/www
COPY .agents/skills/home-technik-proxmox-lxc/scripts/project_api.py /app/project_api.py
COPY deploy/docker/start.py /app/start.py
COPY deploy/docker/nginx.conf /app/nginx.conf
USER 10001:10001
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD python /app/start.py --healthcheck
ENTRYPOINT ["/usr/bin/tini", "--", "python", "/app/start.py"]
