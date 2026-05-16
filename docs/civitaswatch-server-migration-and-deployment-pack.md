# CivitasWatch Server Migration and Deployment Pack

Prepared for: LE / hosting provider  
Generated: 2026-05-16  
System phase: CivitasWatch Phase 3

## 1. Executive Summary

CivitasWatch is ready for a controlled migration from the current local PostgreSQL database to a hosted server environment. The current database is small, structurally current, and suitable for a full logical backup/restore process. Prisma validation passes and Prisma migration status reports that the database schema is up to date.

The recommended approach is to provision a hosted staging environment first, restore the current database dump into staging, validate Prisma and application workflows, compare table counts, then repeat the process for production cutover. No production cutover should occur until the hosted staging restore is validated.

Hosting must provide HTTPS, a supported PostgreSQL version, Node.js LTS, Prisma compatibility, Nginx or equivalent reverse proxy, a managed process runner such as PM2 or systemd, daily backups, firewall controls, and monitoring.

## 2. Current Database Migration Report

### Database Summary

- Database: `civitaswatch_live`
- Local PostgreSQL version: `PostgreSQL 18.3 (Homebrew) on x86_64-apple-darwin21.6.0`
- Database size: `12 MB`
- Public tables: 25
- Prisma migrations: 13 applied migration records
- Prisma schema status: valid
- Prisma migration status: database schema is up to date

### Key Row Counts

| Data Area | Count |
|---|---:|
| Members | 3,114 |
| Users | 7 |
| Vehicles | 2 |
| Patrol sessions | 69 |
| Patrol crew rows | 68 |
| Patrol events | 161 |
| Incidents | 40 |
| Assistance-request patrol events | 34 |
| Incident codes | 8 |
| Incident subcodes | 18 |
| Service types | 6 |
| Infrastructure types | 6 |
| Emergency contact types | 6 |
| Intelligence entities | 7 |
| Intelligence links | 12 |

### Table Inventory

The `public` schema contains:

- `EmergencyContactType`
- `Incident`
- `IncidentCode`
- `IncidentServiceLog`
- `IncidentSubcode`
- `IncidentVOILink`
- `InfrastructureType`
- `IntelligenceEntity`
- `IntelligenceLink`
- `Member`
- `Organisation`
- `PatrolEvent`
- `PatrolEventVOILink`
- `PatrolReportAuditLog`
- `PatrolSession`
- `PatrolSessionCrew`
- `PrePatrolChecklist`
- `Sector`
- `Service`
- `ServiceType`
- `User`
- `UserSectorAccess`
- `VOIVehicleDetails`
- `Vehicle`
- `_prisma_migrations`

### Key Data Domains

- Authentication and users: `User`, `Member`, `UserSectorAccess`.
- Members and patrollers: `Member`, including call sign, patrol approval, patrol status, training, and sector fields.
- Vehicles: `Vehicle`, plus temporary vehicle fields on `PatrolSession`.
- Organisations and sectors: `Organisation`, `Sector`, and sector text fields on operational records.
- Patrol sessions: `PatrolSession`, including driver, vehicle, call sign, status, KM, and shift details.
- Patrol crew: `PatrolSessionCrew`; crew members are separate from the logged-in driver.
- Patrol events: `PatrolEvent`, including incident response lifecycle, assistance, classifications, reference number, and location fields.
- Incidents: `Incident`, including status, severity, linked patrol, incident code/subcode references, and address fields.
- Assistance requests: currently derived from `PatrolEvent.assistance`; there is no separate assistance request table yet.
- Reports and audit history: `PatrolSession`, `PatrolEvent`, `Incident`, `IncidentServiceLog`, and `PatrolReportAuditLog`.
- Admin master registers: `IncidentCode`, `IncidentSubcode`, `ServiceType`, `InfrastructureType`, `EmergencyContactType`.
- Intelligence: `IntelligenceEntity`, `IntelligenceLink`, `VOIVehicleDetails`, `IncidentVOILink`, and `PatrolEventVOILink`.

## 3. Server Technical Specification

### Pilot Server Sizing

- CPU: 2 vCPU
- Memory: 4 GB RAM
- Storage: 80-100 GB SSD
- Suitable for pilot use, early patrol/admin workflows, limited Control Room use, and low-volume reporting.

### Production Server Sizing

- CPU: 4 vCPU
- Memory: 8-16 GB RAM
- Storage: 160-250 GB SSD/NVMe
- Suitable for live operations, growing member data, patrol history, reports, admin registers, intelligence records, and future map growth.

### Operating System

- Ubuntu Server 24.04 LTS or compatible Linux server.
- Security updates enabled.
- Time synchronization enabled.
- Dedicated non-root deployment user.
- SSH key access preferred.

### Runtime and Process Management

- Node.js LTS.
- npm compatible with the selected Node.js LTS version.
- PM2 or systemd for API/web process supervision.
- Nginx reverse proxy in front of the Node.js process.
- HTTPS / SSL certificate required for production traffic.

### PostgreSQL Compatibility

PostgreSQL 18 is not mandatory. PostgreSQL 16, 17, or 18 may be acceptable depending on hosting provider support, but the dump must first be restored to a hosted staging database and validated before production cutover.

## 4. Required Software Stack

- Linux server, preferably Ubuntu Server 24.04 LTS.
- Node.js LTS.
- npm.
- Prisma CLI support for validation, migration status, and Prisma Client generation.
- PostgreSQL 16, 17, or 18, subject to provider support and successful restore validation.
- Nginx or equivalent reverse proxy.
- PM2 or systemd.
- SSL/TLS certificate management, such as Let's Encrypt or provider-managed certificates.
- Backup tooling using `pg_dump` and `pg_restore`.
- Firewall tooling or provider firewall controls.

## 5. Environment Variables and Secrets

Required environment variables are expected to include:

- `DATABASE_URL`: hosted PostgreSQL connection string.
- `JWT_SECRET` or equivalent API authentication secret.
- `PORT`: internal Node.js app/API port.
- `NODE_ENV=production`.
- CORS / frontend origin settings if the API and web client are served from different domains.
- Any provider-specific SSL or database connection options required by the hosted PostgreSQL service.

Secrets must be stored in the server environment or a secret manager. Hosted credentials must not be committed to the repository.

## 6. Backup and Restore Plan

### Backup Plan

Recommended source backup format:

```bash
pg_dump --format=custom --verbose --no-owner --no-acl --file=civitaswatch_live_YYYYMMDD_HHMMSS.dump civitaswatch_live
```

Backup requirements:

- Include `_prisma_migrations`.
- Include all application tables.
- Store a timestamped copy outside the application repo.
- Take a manual backup before production cutover.
- Maintain daily hosted database backups after deployment.
- Periodically test restore into staging.

### Restore Plan

Recommended restore approach:

```bash
pg_restore --verbose --clean --if-exists --no-owner --no-acl --dbname="$HOSTED_DATABASE_URL" civitaswatch_live_YYYYMMDD_HHMMSS.dump
```

Restore sequence:

1. Provision hosted PostgreSQL staging database.
2. Restore the local dump into staging.
3. Run Prisma validation and migration status against staging.
4. Compare exact table counts against the migration report.
5. Run application smoke tests.
6. Take final local backup for cutover.
7. Restore final dump into hosted production.
8. Switch production `DATABASE_URL`.
9. Keep the original local database and dump untouched until hosted production is fully verified.

## 7. Security Requirements

- HTTPS is required for all production traffic.
- Firewall must be enabled.
- Only required ports should be open:
  - `22` for SSH, restricted where possible.
  - `80` for HTTP redirect.
  - `443` for HTTPS.
- PostgreSQL must not be publicly exposed unless specifically secured by firewall, VPN, provider controls, TLS, strong credentials, and restricted IP access.
- SSH key access is preferred.
- Disable root SSH login where operationally feasible.
- Use strong database credentials.
- Production `.env` must be readable only by the deployment user or service account.
- Logs must not expose passwords, auth tokens, or database URLs.
- Apply regular OS security updates.

## 8. Mobile Patroller Requirements

The patroller interface is mobile-first.

Hosting must support reliable mobile workflows:

- Login and active patrol lookup.
- Starting a patrol session with logged-in driver, registered or temporary vehicle, manually typed patrol session call sign, sector, start KM, and optional crew.
- Crew picker member search/add/remove behavior.
- Patrol action submissions for emergency, incident response, observation, and infrastructure.
- Incident response lifecycle actions.
- Optional coordinate submission on patrol events.
- Ending patrol sessions and saving patrol reports.

HTTPS is required because mobile users will submit operational data, incident information, assistance requests, and authentication tokens over the network.

## 9. Control Room Requirements

Control Room must retain the current local tab layout. Hosting and reverse proxy routing must not reintroduce old Control Room route sections or rewrite routes in a way that breaks the local tab behavior.

Control Room must support:

- Active patrol monitoring.
- Patrol call sign, driver, crew, vehicle, sector, and patrol status display.
- Assistance request visibility.
- Incident visibility.
- Patrol report access.
- Selected patrol timeline access.
- Frequent refresh or polling during operations.
- Future live map subscriptions when implemented.

## 10. Admin, Reports, Registers, and Intelligence Notes

### Admin and Registers

Registers are source-of-truth/master-data screens and must remain separate from operational reports. Critical register data includes:

- Members
- Patrollers
- Vehicles
- Organisations
- Incident Codes
- Incident Subcodes
- Service Types
- Infrastructure Types
- Emergency Contact Types

### Reports

Reports provide operational history and accountability:

- Incident Reports
- Patrol Reports
- Assistance Request Reports
- Vehicle Reports where applicable
- Patrol report audit history

### Intelligence

The intelligence module depends on:

- Intelligence entities.
- Intelligence links.
- VOI vehicle details.
- Incident-to-VOI links.
- Patrol-event-to-VOI links.
- Coordinates on intelligence entities for future map views.

## 11. Future Live Map Requirements

The current system stores event coordinates on patrol events and intelligence entities, but it does not yet have continuous live patrol GPS tracking.

Future map work should plan for:

- A future `PatrolLocationPing`-style table or equivalent.
- Increased write volume from mobile location updates.
- WebSocket or Server-Sent Events for live updates.
- Additional indexes on patrol/session/time/location fields.
- Control Room live map subscriptions.
- Monitoring database growth caused by location history.

The production server should include CPU, memory, and storage headroom for this future capability.

## 12. Deployment Checklist

- Provision Ubuntu Server 24.04 LTS or compatible Linux server.
- Create a dedicated deployment user.
- Configure SSH key access.
- Enable firewall.
- Install Node.js LTS and npm.
- Install or provision PostgreSQL.
- Install Nginx.
- Configure SSL certificate and renewal.
- Configure server environment variables and secrets.
- Restore database into hosted staging first.
- Run Prisma validation against hosted staging.
- Run Prisma migration status against hosted staging.
- Compare database row counts.
- Install application dependencies.
- Build the web application.
- Start the API/web service with PM2 or systemd.
- Configure Nginx reverse proxy.
- Confirm HTTPS access.
- Confirm database backup job.
- Confirm monitoring and logs.
- Schedule production cutover after staging validation passes.

## 13. Post-Migration Verification Checklist

Database verification:

- `npx prisma validate --schema apps/api/prisma/schema.prisma` passes.
- `npx prisma migrate status --schema apps/api/prisma/schema.prisma` reports database is up to date.
- `_prisma_migrations` count is 13.
- `Member` count is 3,114.
- `PatrolSession` count is 69.
- `PatrolSessionCrew` count is 68.
- `PatrolEvent` count is 161.
- `Incident` count is 40.
- Assistance-request patrol events count is 34.

Application verification:

- Admin login works.
- Patroller login works.
- Members and patrollers load.
- Vehicles load.
- Registers load and persist.
- Patrol reports load.
- Incident reports load.
- Assistance request report/history loads.
- Control Room local tabs load and remain unchanged.
- Patrol start/end workflow works in staging.
- Patrol action submission works in staging.
- Master register APIs load.
- Intelligence entities and graph load.
- HTTPS is active.
- Backup job runs successfully.

## 14. Risks and Assumptions

- PostgreSQL 18 is not mandatory, but the hosted PostgreSQL version must be compatible with the current local database and Prisma stack.
- PostgreSQL 16, 17, or 18 may be acceptable depending on hosting provider support, but the dump must first be restored to staging and validated before production cutover.
- The current database is small, but member imports, patrol events, reports, audit logs, intelligence records, and future map history will grow.
- Assistance requests are currently represented by `PatrolEvent.assistance`, not by a separate table.
- Sector isolation is still evolving; some records use text sector fields while master registers use `sectorId`.
- Incident and patrol event classification references are nullable and should not be made mandatory during hosting.
- Authentication depends on existing password hashes; do not recreate users during migration.
- Do not run seed scripts over restored production data.
- Do not run database reset commands on hosted production.
- Preserve `_prisma_migrations` exactly during backup and restore.
