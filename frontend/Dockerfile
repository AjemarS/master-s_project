# ----------------------
# BUILD stage
# ----------------------
FROM node:22-alpine AS build

RUN apk add --no-cache python3 build-base

WORKDIR /build

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

RUN npm run build

RUN npm prune --omit=dev

# ----------------------
# DEV stage
# ----------------------
FROM node:22-alpine AS dev

USER root
WORKDIR /app

EXPOSE 3000

CMD ["npm", "run", "dev"]

# ----------------------
# PROD stage
# ----------------------
FROM node:22-alpine AS prod

RUN addgroup -S appuser && adduser -S -G appuser -h /app appuser

WORKDIR /app

COPY --from=build /build/package*.json ./
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/.next ./.next
COPY --from=build /build/public ./public
COPY --from=build /build/next.config.* ./
COPY --from=build /build/app/messages ./app/messages

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["npm", "run", "start"]
