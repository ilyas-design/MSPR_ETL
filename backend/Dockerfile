FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --timeout=120 --retries=5 -r requirements.txt

COPY . .

ARG DJANGO_BUILD_SECRET_KEY=build-dummy-for-collectstatic-only
RUN DJANGO_BUILD_SECRET_KEY=$DJANGO_BUILD_SECRET_KEY SECRET_KEY=$DJANGO_BUILD_SECRET_KEY \
    python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["sh", "-c", "python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120"]
