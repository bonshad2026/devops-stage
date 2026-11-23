FROM node:22-bookworm-slim

WORKDIR /app
COPY . /app/

# ffmpeg-static ships a linux binary; make sure it stayed executable through tar
RUN find /app/node_modules/ffmpeg-static -type f -name ffmpeg -exec chmod +x {} \; 2>/dev/null || true

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data/creator

EXPOSE 8080
CMD ["node", "server.js"]
