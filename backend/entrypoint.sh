#!/bin/sh
set -e

if [ "$#" -gt 0 ]; then
    exec "$@"
fi

python manage.py migrate --noinput
python manage.py seed_demo

exec gunicorn careerquest_api.wsgi:application --bind 0.0.0.0:8000 --workers 3
