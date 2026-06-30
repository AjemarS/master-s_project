FROM python:3.11-slim

WORKDIR /app

# Встановлення системних залежностей
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

# Спільна бібліотека (shared-auth, спільні утиліти)
COPY shared-lib /shared-lib

# Копіювання файлів залежностей
COPY product-service/requirements.txt .

# Встановлення Python залежностей
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install -e /shared-lib

# Копіювання коду проекту
COPY product-service/ .

# Відкриття порту
EXPOSE 8000

# Команда запуску буде в docker-compose.yml