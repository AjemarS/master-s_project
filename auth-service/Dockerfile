# ----------------------
# BUILD stage
# ----------------------
FROM node:22-alpine AS build

RUN apk add --no-cache python3 build-base

WORKDIR /build

COPY auth-service/package*.json ./
RUN npm ci

COPY auth-service/ ./

RUN npm run build

RUN npm prune --omit=dev

# ----------------------
# DEV stage
# ----------------------
FROM node:22-alpine AS dev

USER root
WORKDIR /app

EXPOSE 3001

CMD ["npm", "run", "dev"]

# ----------------------
# PROD stage
# ----------------------
FROM node:22-alpine AS prod

RUN addgroup -S appuser && adduser -S -G appuser -h /app appuser

WORKDIR /app

COPY --from=build /build/package*.json ./
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/dist ./dist

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
