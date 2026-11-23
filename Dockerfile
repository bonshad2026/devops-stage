FROM docker-mirror.liara.ir/library/node:22-bookworm-slim

WORKDIR /stage
COPY launcher.mjs ./
COPY apps ./apps

# ffmpeg-static's binary has to stay executable through git and tar
RUN find /stage/apps -type f -name ffmpeg -exec chmod +x {} \; 2>/dev/null || true

ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "launcher.mjs"]
