FROM node:22-alpine

WORKDIR /app

# Копіювання package files
COPY package*.json ./

# Build tools for native addons (better-sqlite3 via better-auth)
RUN apk add --no-cache python3 build-base

# Встановлення залежностей
RUN npm install

# Копіювання коду
COPY . .

# Відкриття порту
EXPOSE 3001

# Команда запуску буде в docker-compose.yml