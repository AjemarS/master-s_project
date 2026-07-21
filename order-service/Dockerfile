# ----------------------
# BUILD stage
# ----------------------
FROM python:3.11-slim AS build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

COPY shared-lib/ /build/shared-lib/
COPY order-service/requirements.txt /build/
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install /build/shared-lib/

# ----------------------
# DEV stage
# ----------------------
FROM build AS dev

USER root
WORKDIR /app

EXPOSE 8002

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8002"]

# ----------------------
# PROD stage
# ----------------------
FROM python:3.11-slim AS prod

RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r app && useradd -r -g app -d /app -s /sbin/nologin -c "App user" app

WORKDIR /app

COPY --from=build /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=build /usr/local/bin/ /usr/local/bin/

COPY order-service/ /app/

USER app
EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=10s \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/api/health/')" || exit 1

CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8002"]
