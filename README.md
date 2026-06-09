# 21 Training Club — Full-stack Next.js

Fitness coaching app migrated to **Next.js 16**, **Tailwind CSS**, and **Bun** as a single full-stack project (no separate Python backend or CRA frontend).

## Stack

- Next.js 16 (App Router, Turbopack)
- React 19
- Tailwind CSS 4
- MongoDB
- Bun

## Setup

1. Install [Bun](https://bun.sh) and [MongoDB](https://www.mongodb.com/try/download/community) (or use Atlas).

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Install dependencies (if needed):

```bash
bun install
```

4. Run the dev server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker (development)

Run the dev server in the background with hot reload (same as `bun run dev`):

```bash
docker compose up -d --build
```

Open [http://localhost:3000](http://localhost:3000) (or your chosen port). Code changes on your machine sync into the container automatically.

Change the host port with `APP_PORT` (docker compose reads this from a `.env` file or your shell):

```bash
# option 1: .env file next to docker-compose.yml
echo "APP_PORT=8080" >> .env

# option 2: inline
APP_PORT=8080 docker compose up -d --build
```

Then open [http://localhost:8080](http://localhost:8080).

Useful commands:

```bash
docker compose logs -f app   # follow logs
docker compose restart app   # restart container
docker compose down          # stop
```

Requires `.env.local` (copy from `.env.example` and fill in `MONGO_URL`, `JWT_SECRET`, etc.).

If hot reload feels slow on macOS, the compose file already enables file polling (`WATCHPACK_POLLING` / `CHOKIDAR_USEPOLLING`).

After changing Docker setup or if you see MongoDB module errors, reset volumes and rebuild:

```bash
docker compose down -v
docker compose up -d --build
```

## First run

- If the database has **no users**, open `/register` to create the first admin account.
- After that, registration is disabled; admins create clients from `/admin`.

Default credentials (if you seed the DB manually):

- Admin: `admin@fitnesspro.com` / `admin123`

## API

All former FastAPI routes live under `/api/*` (e.g. `/api/auth/login`, `/api/workouts/week/1`).

## Scripts

| Command       | Description        |
|---------------|--------------------|
| `bun dev`     | Development server |
| `bun build`   | Production build   |
| `bun start`   | Production server  |
| `bun lint`    | ESLint             |
