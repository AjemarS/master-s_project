# ----------------------
# BUILD stage
# ----------------------
FROM node:24-alpine AS build

RUN apk add --no-cache python3 build-base

WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

# Inlined into the client bundle at build time, so each environment builds its own image
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL

RUN npm run build

# ----------------------
# DEV stage
# ----------------------
FROM node:24-alpine AS dev

USER root
WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ----------------------
# PROD stage
# ----------------------
FROM node:24-alpine AS prod

RUN addgroup -S appuser && adduser -S -G appuser -h /app appuser

WORKDIR /app

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000

# output: "standalone" traces only the node_modules the server needs
COPY --from=build --chown=appuser:appuser /build/.next/standalone ./
COPY --from=build /build/.next/static ./.next/static
COPY --from=build /build/public ./public

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
