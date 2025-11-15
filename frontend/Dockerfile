FROM node:21

WORKDIR /app

# Копіювання package files
COPY package*.json ./

# Встановлення залежностей
RUN npm install

# Копіювання коду
COPY . .

# Відкриття порту
EXPOSE 3000