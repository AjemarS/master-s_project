FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY auth.js /etc/nginx/auth.js
COPY proxy_api.conf /etc/nginx/proxy_api.conf
COPY proxy_public.conf /etc/nginx/proxy_public.conf
COPY proxy_frontend.conf /etc/nginx/proxy_frontend.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
