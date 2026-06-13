FROM python:3.11-slim

WORKDIR /app

# Копіювання файлів залежностей
COPY requirements.txt .

# Встановлення Python залежностей
RUN pip install --no-cache-dir -r requirements.txt

# Копіювання коду
COPY . .

# Відкриття порту
EXPOSE 8080

# Запуск FastAPI з uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]