FROM nginx:1.28-alpine
COPY default.conf.template /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER=CCTV_EDGE_TOKEN|CCTV_BACKEND_HOST|CCTV_MEDIA_HOST
EXPOSE 8080
