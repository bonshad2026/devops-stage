FROM docker-mirror.liara.ir/library/node:22-bookworm-slim AS node-runtime
FROM docker-mirror.liara.ir/library/nginx:stable-bookworm
COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
WORKDIR /stage
COPY launcher.mjs index.html ./
COPY apps ./apps
RUN set -eu; for app in /stage/apps/*/app; do tar -xzf "$app/production-deps.tar.gz" -C "$app"; rm "$app/production-deps.tar.gz"; done; find /stage/apps -type f -name ffmpeg -exec chmod +x {} +
EXPOSE 80
CMD ["node", "/stage/launcher.mjs"]
