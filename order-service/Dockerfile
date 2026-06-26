FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY shared-lib /shared-lib

COPY order-service/requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt && \
    pip install -e /shared-lib

COPY order-service/ .

EXPOSE 8002
