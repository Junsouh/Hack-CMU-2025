# Pantry Bravo — React + Flask + Postgres + Redis (Dockerized)

## Quick start
```bash
cp .env.example .env  # set your keys
docker compose up --build
# Frontend: http://localhost/
# API: http://localhost/api/health
```

## Tech
- Frontend: React + Vite + TypeScript + Material UI + html5-qrcode
- Backend: Flask + SQLAlchemy + JWT + Alembic
- DB: Postgres; Cache/queues: Redis
- APIs: Open Food Facts (barcode → product & nutrition), Spoonacular (optional) for recipes
- Dockerized with Nginx proxying /api → backend
