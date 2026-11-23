FROM docker-mirror.liara.ir/library/nginx:stable-alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
