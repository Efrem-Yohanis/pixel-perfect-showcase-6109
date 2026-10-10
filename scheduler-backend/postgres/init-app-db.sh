#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=django_user="$DJANGO_DB_USER" \
  --set=django_password="$DJANGO_DB_PASSWORD" \
  --set=django_db="$DJANGO_DB_NAME" <<'SQL'
CREATE USER :"django_user" WITH PASSWORD :'django_password';
CREATE DATABASE :"django_db" OWNER :"django_user";
SQL
