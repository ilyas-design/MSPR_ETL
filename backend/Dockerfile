FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN SECRET_KEY=build-dummy python manage.py collectstatic --noinput

EXPOSE 8000

# --timeout 180 : les endpoints IA (proxy LLM gpt-oss free) peuvent prendre
# 45-120s. Le défaut gunicorn (30s) tuait le worker → 500 sur les générations.
CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 180"]
