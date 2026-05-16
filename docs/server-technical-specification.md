# CivitasWatch Server Technical Specification

Generated: 2026-05-16  
Purpose: define the recommended hosting baseline for CivitasWatch Phase 3.

## 1. Executive Summary

CivitasWatch should be hosted on a stable Linux server with Node.js LTS, PostgreSQL, Nginx, HTTPS, managed process supervision, automated backups, firewall controls, and monitoring. The current workload is suitable for a modest pilot server, but production should start with additional CPU, memory, and SSD/NVMe capacity to support patrol operations, Control Room usage, reports, admin registers, intelligence records, and future live map features.

Recommended approach: deploy first to a hosted staging environment, restore the current database backup, validate Prisma and application workflows, then cut over production after post-restore checks pass.

## 2. Recommended Server Size for Pilot

- CPU: 2 vCPU
- Memory: 4 GB RAM
- Storage: 80-100 GB SSD
- Suitable for: pilot usage, initial patrol/admin workflows, limited Control Room usage, and low-volume reporting.

## 3. Recommended Server Size for Production

- CPU: 4 vCPU
- Memory: 8-16 GB RAM
- Storage: 160-250 GB SSD/NVMe
- Suitable for: live operational usage, Control Room monitoring, growing member data, patrol events, reports, admin registers, intelligence graph data, and future live map expansion.

## 4. Required Operating System

- Ubuntu Server 24.04 LTS or compatible Linux server.
- Security updates enabled.
- Time synchronization enabled.
- Dedicated non-root deployment user.
- SSH key access preferred over password access.

## 5. Required Runtime Stack

- Node.js LTS.
- npm compatible with the deployed Node.js LTS version.
- PM2 or systemd process manager for API process supervision.
- Build tooling required by the app deployment process.
- Nginx reverse proxy in front of the Node.js API/web service.

## 6. Required Database Stack

- PostgreSQL hosted locally on the server or via managed PostgreSQL.
- PostgreSQL 16, 17, or 18 may be acceptable depending on hosting provider support and successful restore validation.
- Database must be backed up daily.
- PostgreSQL should not be publicly exposed unless specifically secured with firewall rules, TLS, strong credentials, and restricted IP access.

## 7. Required Node.js / npm / Prisma Support

- Node.js LTS installed and pinned for repeatable deployment.
- npm available for install/build commands.
- Prisma CLI support for:
  - `npx prisma validate --schema apps/api/prisma/schema.prisma`
  - `npx prisma migrate status --schema apps/api/prisma/schema.prisma`
  - Prisma Client generation during deployment if required.
- Deployed migrations directory must match the application release.
- Do not run destructive Prisma commands on production.

## 8. Required PostgreSQL Support

- PostgreSQL version compatible with the current Prisma stack and restored database.
- Restore must be tested in hosted staging before production cutover.
- Required PostgreSQL capabilities:
  - Standard relational constraints and indexes.
  - UUID/text primary keys as currently modeled.
  - Timestamp fields used by patrols, incidents, reports, and audit history.
  - Reliable backup and restore tooling through `pg_dump` and `pg_restore`.

## 9. Nginx / Reverse Proxy Requirement

- Nginx should terminate public HTTP/HTTPS traffic and proxy to the Node.js process.
- Required behavior:
  - Redirect HTTP to HTTPS.
  - Proxy API/web requests to the internal app port.
  - Preserve headers such as `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
  - Configure upload/body limits appropriate to future import/report workflows.
  - Enable access and error logs.

## 10. SSL / HTTPS Requirement

- HTTPS is required for all production traffic.
- Use a valid SSL certificate, for example Let's Encrypt or provider-managed TLS.
- Auto-renewal must be configured and monitored.
- Cookies, auth tokens, and API traffic must not be served over plain HTTP in production.

## 11. Environment Variables Required

Expected server-side environment variables include:

- `DATABASE_URL`: hosted PostgreSQL connection string.
- `JWT_SECRET` or equivalent API auth secret.
- `PORT`: internal Node.js app/API port.
- `NODE_ENV=production`.
- CORS / frontend origin settings if the API and web client are served from different domains.
- Any provider-specific SSL or database connection options required by the hosted PostgreSQL service.

Secrets must be stored in the server environment or a secret manager, not committed to the repository.

## 12. Security Requirements

- Firewall enabled.
- Only required ports open, typically:
  - `22` for SSH, restricted where possible.
  - `80` for HTTP redirect.
  - `443` for HTTPS.
- PostgreSQL port should remain private unless there is a deliberate secured remote access design.
- SSH key access preferred.
- Disable root SSH login where operationally feasible.
- Strong database credentials.
- Production `.env` readable only by the deployment user/service account.
- Regular OS security updates.
- Application logs must not expose passwords, tokens, or database URLs.

## 13. Backup Requirements

- Daily PostgreSQL backups.
- Keep multiple restore points.
- Store backups off-server or in provider-managed backup storage.
- Take a manual backup before every production deployment or migration.
- Periodically test restore into staging.
- Backup should include `_prisma_migrations` and all application tables.

Recommended database backup format:

```bash
pg_dump --format=custom --verbose --no-owner --no-acl --file=civitaswatch_$(date +%Y%m%d_%H%M%S).dump "$DATABASE_URL"
```

## 14. Monitoring Requirements

- Monitor CPU, memory, disk usage, and database storage growth.
- Monitor Node.js process uptime through PM2, systemd, or provider tools.
- Monitor Nginx error logs.
- Monitor API application logs.
- Monitor PostgreSQL availability and backup success.
- Alert on:
  - App process down.
  - Database connection failures.
  - Disk usage above safe threshold.
  - Failed backups.
  - SSL certificate renewal failure.

## 15. Mobile Patroller Requirements

- HTTPS required for mobile browser/app use.
- Low-latency API responses for patrol start/end and patrol action submission.
- Stable handling of:
  - Active patrol session lookup.
  - Vehicle selection.
  - Manual patrol session call sign.
  - Crew picker member search.
  - Patrol event forms.
  - Incident response lifecycle actions.
  - Optional coordinate submission.
- Server must tolerate intermittent mobile network behavior through reliable request handling and clear API errors.

## 16. Control Room Requirements

- Reliable dashboard and live operations API performance.
- Active patrols, assistance requests, incidents, patrol reports, and selected timelines must load consistently.
- Server should support frequent refresh/polling during operations.
- Database indexes on patrol status, sector, event type, event time, and incident status are important.
- Control Room routing must remain application-local; hosting should not rewrite app routes in a way that breaks the local tab layout.

## 17. Reports and Admin Requirements

- Reports need reliable access to patrol sessions, patrol events, incidents, assistance requests, and audit history.
- Admin master registers need persistent CRUD access to:
  - Incident Codes
  - Incident Subcodes
  - Service Types
  - Infrastructure Types
  - Emergency Contact Types
- Server must support larger report queries as historical data grows.
- Backups must preserve report and audit data for accountability.

## 18. Intelligence Module Requirements

- Intelligence entity and graph views need reliable API access to entities, links, incident VOI links, patrol event VOI links, and VOI vehicle details.
- Server should support graph-style reads without timing out as intelligence data grows.
- Future indexing review may be needed as entity/link volume increases.
- Coordinate fields on intelligence entities should be preserved for future mapping.

## 19. Future Live Map Requirements

The current system stores event coordinates on patrol events and intelligence entities, but it does not yet store continuous patrol GPS pings.

Future live map support should plan for:

- A future `PatrolLocationPing`-style table or equivalent.
- Increased write volume from periodic mobile location updates.
- WebSocket or Server-Sent Events for live updates.
- Additional database indexes on patrol/session/time/location fields.
- Server capacity for sustained concurrent Control Room map subscriptions.
- Monitoring of database growth caused by location history.

The production starting point should provide enough CPU, memory, and storage headroom to add this capability without immediate server replacement.

## 20. Deployment Checklist

- Provision Ubuntu Server 24.04 LTS or compatible Linux server.
- Create deployment user.
- Configure SSH key access.
- Enable firewall.
- Install Node.js LTS and npm.
- Install or provision PostgreSQL.
- Install Nginx.
- Configure SSL certificate and renewal.
- Configure application environment variables.
- Restore database into staging first.
- Run Prisma validate and migrate status against hosted database.
- Install dependencies.
- Build web application.
- Start API/web service with PM2 or systemd.
- Configure Nginx reverse proxy.
- Confirm HTTPS access.
- Confirm backup job and backup storage.
- Confirm monitoring and logs.

## 21. Post-Deployment Verification Checklist

- API process is running.
- Nginx is serving HTTPS.
- HTTP redirects to HTTPS.
- Database connection succeeds.
- `npx prisma validate --schema apps/api/prisma/schema.prisma` passes.
- `npx prisma migrate status --schema apps/api/prisma/schema.prisma` reports database is up to date.
- Admin login works.
- Patroller login works.
- Registers load.
- Reports load.
- Patrol start/end workflow works in staging.
- Patrol action submission works in staging.
- Assistance request history loads.
- Control Room local tabs load and remain unchanged.
- Incident reports load.
- Master register CRUD loads.
- Intelligence entities and graph load.
- Backup job runs successfully.
- Restore procedure has been tested in staging.
