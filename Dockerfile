FROM docker-mirror.liara.ir/library/node:22-bookworm-slim

WORKDIR /stage
COPY launcher.mjs index.html ./
COPY apps ./apps

# Liara excludes node_modules during upload; dependencies travel as an archive.
RUN set -eu; for app in /stage/apps/*/app; do tar -xzf "$app/production-deps.tar.gz" -C "$app"; rm "$app/production-deps.tar.gz"; done

# ffmpeg-static's binary has to stay executable through git and tar
RUN find /stage/apps -type f -name ffmpeg -exec chmod +x {} +

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "launcher.mjs"]
