# CivitasWatch Deployment

## Recommended Topology

Deploy CivitasWatch as two separate services:

- API: a long-running Node.js service running `apps/api`.
- Web: a static Vite build running `apps/web`.
- Database: managed PostgreSQL.

This keeps the API lifecycle, Prisma connections, health checks, and logs on a conventional server process while allowing the web app to be served from static hosting or a CDN.

## API Environment Variables

Set these for the API service:

```sh
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
JWT_SECRET="replace-with-a-long-random-secret"
NODE_ENV="production"
PORT="4000"
CORS_ORIGINS="https://your-web-domain.example"
```

Notes:

- `DATABASE_URL` is required in production.
- `JWT_SECRET` is required in production.
- `PORT` should match the hosting provider's assigned port if one is provided.
- `CORS_ORIGINS` accepts comma-separated browser origins.
- Do not commit real `.env` files or secrets.

## Web Environment Variables

Set this for the web build:

```sh
VITE_API_URL="https://your-api-domain.example"
```

Standalone static pages can also use:

```html
<script>
  window.CIVITASWATCH_API_URL = "https://your-api-domain.example";
</script>
```

If no hosted API URL is configured, local fallback remains `http://localhost:4000`.

## Local Development

From the repository root:

```sh
npm run dev
```

Run API only:

```sh
npm run dev:api
```

Run web only:

```sh
npm run dev:web
```

## Production Build And Start

Build the web app from the repository root:

```sh
npm run build
```

Build the web app directly:

```sh
npm run build --workspace apps/web
```

Start the API from the repository root:

```sh
npm run start:api
```

Start the API directly:

```sh
npm run start --workspace apps/api
```

Preview the built web app locally:

```sh
npm run preview --workspace apps/web
```

Do not run migrations automatically in API start commands. Run database migration commands as a separate deployment step.

## Health Endpoints

The API exposes public health endpoints:

```text
GET /health
GET /health/live
GET /health/ready
```

Use `/health/live` for liveness checks and `/health/ready` for readiness checks. Readiness currently performs a lightweight app-status check only and does not run a database query.

## CORS Configuration

The API reads `CORS_ORIGINS`.

If `CORS_ORIGINS` is not set, the API preserves local development behavior with wildcard origin support.

For production, set exact allowed origins:

```sh
CORS_ORIGINS="https://your-web-domain.example"
```

For multiple origins:

```sh
CORS_ORIGINS="https://admin.example,https://patrol.example"
```

Bearer token auth uses the `Authorization` header, so it must remain allowed by CORS.

## Managed Postgres

Use managed PostgreSQL for production. Configure the API with the provider's connection string through `DATABASE_URL`.

Recommended operational baseline:

- Enable automated backups.
- Keep database credentials out of the repository.
- Run Prisma migrations as an explicit deployment step.
- Monitor connection limits before scaling API instances.
- Use one production database per environment.
