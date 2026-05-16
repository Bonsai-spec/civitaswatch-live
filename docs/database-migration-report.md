# CivitasWatch Database Migration Report

Generated: 2026-05-16  
Source database: `civitaswatch_live`  
Purpose: migrate the current local PostgreSQL database to a hosted server.

## 1. Executive Summary

The current CivitasWatch local PostgreSQL database is small, structurally current, and suitable for a full logical backup/restore migration to a hosted PostgreSQL server. Prisma validation passed, Prisma migration status reports the schema is up to date, and the local database contains 25 public tables with 13 applied Prisma migration records.

The highest-value data to preserve during handover is concentrated in member/register data, patrol sessions, patrol crew, patrol events, incidents, master registers, and intelligence records. Exact row counts show 3,114 members, 69 patrol sessions, 68 patrol crew rows, 161 patrol events, 40 incidents, 34 assistance-request patrol events, 13 Prisma migration records, and 12 MB total database size.

Recommended migration approach: take a custom-format `pg_dump`, restore into an empty hosted staging database first, run Prisma validation and migration status against the hosted database, compare exact row counts, smoke test API workflows, then repeat the backup/restore for production cutover. Do not reseed, reset, or run new migrations during restore unless a later deployment plan explicitly requires it.

## 2. Current Database and PostgreSQL Version

- Database name: `civitaswatch_live`
- PostgreSQL version: `PostgreSQL 18.3 (Homebrew) on x86_64-apple-darwin21.6.0, compiled by Apple clang version 14.0.0 (clang-1400.0.29.202), 64-bit`
- Prisma datasource: PostgreSQL, schema `public`, at `localhost:5432`
- Database size: `12 MB`

## 3. Prisma Schema Status

- `git status --short`: only `docs/database-migration-report.md` was untracked/modified during report generation.
- `npx prisma validate --schema apps/api/prisma/schema.prisma`: passed.
- `npx prisma migrate status --schema apps/api/prisma/schema.prisma`: passed; database schema is up to date.
- Read-only `psql` inspection queries were run against `civitaswatch_live`.

No migrations were run. No data was modified. No schema was changed.

## 4. Prisma Migration History

Prisma reports 13 migrations in `apps/api/prisma/migrations`, all applied.

| Migration | Finished At | Applied Steps | Rolled Back |
|---|---:|---:|---|
| `20260420133826_init` | 2026-04-20 15:38:26 +02 | 1 | No |
| `20260421074207_add_pre_patrol_checklist` | 2026-04-21 09:42:07 +02 | 1 | No |
| `20260421092601_expand_pre_patrol_checklist` | 2026-04-21 11:26:01 +02 | 1 | No |
| `20260421102140_add_vehicle_and_patrol_session` | 2026-04-21 12:21:41 +02 | 1 | No |
| `20260421102944_add_vehicle_and_patrol_session` | 2026-04-21 12:29:44 +02 | 1 | No |
| `20260421204456_add_patrol_events` | 2026-04-21 22:44:56 +02 | 1 | No |
| `20260423095721_add_incident_entity` | 2026-04-23 11:57:21 +02 | 1 | No |
| `20260426101911_add_org_sector` | 2026-04-26 12:19:11 +02 | 1 | No |
| `20260513_baseline_current_database` | 2026-05-13 15:43:16 +02 | 0 | No |
| `20260513135231_add_master_register_models` | 2026-05-13 15:52:31 +02 | 1 | No |
| `20260513184535_add_incident_classification_refs` | 2026-05-13 20:45:35 +02 | 1 | No |
| `20260514060712_add_patrol_session_call_sign` | 2026-05-14 08:07:12 +02 | 1 | No |
| `20260516120000_add_patrol_event_operational_fields` | 2026-05-16 09:01:18 +02 | 1 | No |

Migration note: `20260513_baseline_current_database` is recorded with `applied_steps_count = 0`. Keep it in the migration directory and preserve the `_prisma_migrations` row during backup/restore so the hosted database remains aligned with local migration history.

## 5. Full Table Inventory

The `public` schema contains 25 tables:

| Table |
|---|
| `EmergencyContactType` |
| `Incident` |
| `IncidentCode` |
| `IncidentServiceLog` |
| `IncidentSubcode` |
| `IncidentVOILink` |
| `InfrastructureType` |
| `IntelligenceEntity` |
| `IntelligenceLink` |
| `Member` |
| `Organisation` |
| `PatrolEvent` |
| `PatrolEventVOILink` |
| `PatrolReportAuditLog` |
| `PatrolSession` |
| `PatrolSessionCrew` |
| `PrePatrolChecklist` |
| `Sector` |
| `Service` |
| `ServiceType` |
| `User` |
| `UserSectorAccess` |
| `VOIVehicleDetails` |
| `Vehicle` |
| `_prisma_migrations` |

## 6. Row Counts Per Table

| Table | Rows |
|---|---:|
| `EmergencyContactType` | 6 |
| `Incident` | 40 |
| `IncidentCode` | 8 |
| `IncidentServiceLog` | 7 |
| `IncidentSubcode` | 18 |
| `IncidentVOILink` | 0 |
| `InfrastructureType` | 6 |
| `IntelligenceEntity` | 7 |
| `IntelligenceLink` | 12 |
| `Member` | 3,114 |
| `Organisation` | 1 |
| `PatrolEvent` | 161 |
| `PatrolEventVOILink` | 0 |
| `PatrolReportAuditLog` | 1 |
| `PatrolSession` | 69 |
| `PatrolSessionCrew` | 68 |
| `PrePatrolChecklist` | 2 |
| `Sector` | 4 |
| `Service` | 1 |
| `ServiceType` | 6 |
| `User` | 7 |
| `UserSectorAccess` | 0 |
| `VOIVehicleDetails` | 4 |
| `Vehicle` | 2 |
| `_prisma_migrations` | 13 |

PostgreSQL `pg_stat_user_tables.n_live_tup` estimates were also inspected, but the exact counts above should be used for migration validation.

## 7. Database Size

- Current database size: `12 MB`
- Data volume is currently low. Migration risk is primarily relational and operational, not storage capacity.

## 8. Largest Tables

| Table | Total Size |
|---|---:|
| `Member` | 1416 kB |
| `PatrolEvent` | 272 kB |
| `Incident` | 232 kB |
| `PatrolSessionCrew` | 160 kB |
| `PatrolSession` | 144 kB |
| `IntelligenceEntity` | 96 kB |
| `IncidentServiceLog` | 80 kB |
| `Service` | 80 kB |
| `IncidentSubcode` | 80 kB |
| `IncidentCode` | 64 kB |

The database is currently small. The main migration sensitivity is relational integrity and workflow continuity, not volume.

## 9. Critical Module Breakdown

### Users / Auth

- Tables: `User`, `UserSectorAccess`, `Member`.
- Current rows: `User` 7, `UserSectorAccess` 0, `Member` 3,114.
- User roles: `ADMIN` 4, `CONTROL_ROOM` 1, `PATROLLER` 2.
- Critical fields: `User.email`, `User.passwordHash`, `User.role`, `User.isActive`, `Member.userId`.
- `User.email` is unique.
- `Member.userId` is unique and nullable, allowing imported members without login accounts.

### Members / Patrollers

- Table: `Member`.
- Current rows: 3,114.
- Sector distribution: 3,113 records have no sector value, 1 record has `Sector 1`.
- Critical fields: `firstName`, `surname`, `cellNumber`, `email`, `sector`, `callSign`, `vettingStatus`, `isActive`, `patrolApproved`, `patrolStatus`, `patrolTraining`, `driversLicence`, `pdp`, `userId`.
- Patroller eligibility depends on member approval/status/training fields, not only on `User.role`.

### Vehicles

- Table: `Vehicle`.
- Current rows: 2.
- Critical fields: `registration` unique, `make`, `type`, `colour`, `isActive`.
- Patrol sessions can reference a registered vehicle through `PatrolSession.vehicleId`, or use temporary vehicle fields when `vehicleMode` is not registered.

### Organisations / Sectors

- Tables: `Organisation`, `Sector`, `UserSectorAccess`.
- Current rows: `Organisation` 1, `Sector` 4, `UserSectorAccess` 0.
- `Sector` currently supports future isolation and master-register scoping.
- Many operational records still store sector as text, especially `Member.sector`, `PatrolSession.sector`, `Incident.sector`, and `Service.sector`.

### Patrol Sessions

- Table: `PatrolSession`.
- Current rows: 69.
- Status breakdown: `COMPLETED` 69, no active patrol sessions at inspection time.
- Critical fields: `userId`, `vehicleId`, `checklistId`, `callSign`, `sector`, `startTime`, `endTime`, `startKm`, `endKm`, `totalKm`, `status`, `vehicleMode`, temporary vehicle fields, `editCount`, `isLocked`.
- `callSign` is the manually typed patrol session call sign and must not be confused with `Member.callSign`.

### Patrol Crew

- Table: `PatrolSessionCrew`.
- Current rows: 68.
- Critical fields: `patrolSessionId`, `userId`, `memberId`, `role`, `attendanceStatus`, `joinedAt`, `leftAt`, `creditGranted`.
- Unique constraints prevent duplicate `userId` or duplicate `memberId` per patrol session.
- Driver remains `PatrolSession.userId`; crew is stored separately.

### Patrol Events

- Table: `PatrolEvent`.
- Current rows: 161.
- Type breakdown: `EN_ROUTE` 27, `INCIDENT_REPORTED` 22, `INFRASTRUCTURE` 1, `MOBILE` 25, `ON_SCENE` 21, `RESUME` 11, `RESUME_PATROL` 21, `STAND_DOWN` 33.
- Critical fields: `patrolId`, `type`, `incidentId`, `incidentCodeId`, `incidentSubcodeId`, `referenceNumber`, `description`, `assistance`, `serviceTypeId`, `infrastructureTypeId`, `streetNumber`, `streetName`, `suburb`, `locationNotes`, `latitude`, `longitude`, `createdByUserId`.
- Patrol event operational fields are key to mobile forms, Control Room timelines, reports, and future map views.

### Incidents

- Table: `Incident`.
- Current rows: 40.
- Status breakdown: `OPEN` 16, `IN_PROGRESS` 7, `RESOLVED` 8, `CLOSED` 8, `ARCHIVED` 1.
- Critical fields: `incidentCode` unique, `title`, `description`, `sector`, `status`, `severity`, `source`, `linkedPatrolId`, `createdByUserId`, `reportedAt`, `occurredAt`, `incidentType`, `street`, `suburb`, `incidentCodeId`, `incidentSubcodeId`.
- Incident reports are operational records; `IncidentCode` and `IncidentSubcode` are master registers.

### Assistance Requests

- Assistance requests are currently represented by `PatrolEvent.assistance`, not by a separate table.
- Current assistance events: 34 patrol events have non-empty `assistance`.
- API behavior in `apps/api/src/routes/patrol-events.routes.js` exposes `/assistance/requests` and `/assistance/requests/:id/resolve`.
- Resolving an assistance request updates the relevant `PatrolEvent`, so preserve patrol event history.

### Service Logs

- Tables: `Service`, `IncidentServiceLog`.
- Current rows: `Service` 1, `IncidentServiceLog` 7.
- `IncidentServiceLog` links incidents to coordinated services and tracks `status`, `refNumber`, `requestedAt`, `arrivedAt`, `clearedAt`, and `notes`.
- Patrol assistance must continue to route through Control Room; service logs are the incident-side coordination history.

### Admin Master Registers

- Tables: `IncidentCode`, `IncidentSubcode`, `ServiceType`, `InfrastructureType`, `EmergencyContactType`.
- Current rows: incident codes 8, incident subcodes 18, service types 6, infrastructure types 6, emergency contact types 6.
- All five support optional `sectorId`, `templateSourceId`, active flags, and timestamps.
- `IncidentSubcode.incidentCodeId` is required and protected by `ON DELETE RESTRICT`.

### Reports / Audit Logs

- Tables: `PatrolSession`, `PatrolEvent`, `PatrolReportAuditLog`, `Incident`, `IncidentServiceLog`.
- Current `PatrolReportAuditLog` rows: 1.
- Patrol reports are session-based; incident reports are operational `Incident` records; assistance request reports derive from `PatrolEvent.assistance`.
- Preserve `PatrolReportAuditLog` for accountability after hosted migration.

### Intelligence Entities / Links

- Tables: `IntelligenceEntity`, `IntelligenceLink`, `VOIVehicleDetails`, `IncidentVOILink`, `PatrolEventVOILink`.
- Current rows: intelligence entities 7, intelligence links 12, VOI vehicle details 4, incident VOI links 0, patrol event VOI links 0.
- Critical fields for map/intel: `entityType`, `displayName`, `riskLevel`, `status`, `address`, `suburb`, `sector`, `latitude`, `longitude`, vehicle detail fields, and graph link relationship/strength.

## 10. Key Relationships / Foreign Keys

Important foreign keys:

- `Incident.createdByUserId -> User.id` with cascade delete.
- `Incident.linkedPatrolId -> PatrolSession.id` with set null on delete.
- `Incident.incidentCodeId -> IncidentCode.id` and `Incident.incidentSubcodeId -> IncidentSubcode.id` with set null on delete.
- `PatrolSession.userId -> User.id` with cascade delete.
- `PatrolSession.vehicleId -> Vehicle.id` with set null on delete.
- `PatrolSession.checklistId -> PrePatrolChecklist.id` with set null on delete.
- `PatrolSessionCrew.patrolSessionId -> PatrolSession.id` with cascade delete.
- `PatrolSessionCrew.userId -> User.id` and `memberId -> Member.id` with set null on delete.
- `PatrolEvent.patrolId -> PatrolSession.id` with cascade delete.
- `PatrolEvent.incidentId -> Incident.id` with set null on delete.
- `PatrolEvent.incidentCodeId`, `incidentSubcodeId`, `serviceTypeId`, `infrastructureTypeId`, and `createdByUserId` are nullable relationships.
- `IncidentServiceLog.incidentId -> Incident.id` and `serviceId -> Service.id` both cascade.
- `IncidentSubcode.incidentCodeId -> IncidentCode.id` uses restrict delete.
- `UserSectorAccess.userId` and `sectorId` cascade.
- Intelligence links and VOI links cascade from their parent intelligence, incident, or patrol event records.

Migration implication: avoid deleting or reseeding parent records on the hosted database. Restore the full dump as a unit to preserve IDs and relationships.

## 10.1 Current Prisma Models Summary

Models in `apps/api/prisma/schema.prisma`:

- `User`: authentication account, roles, active flag, sessions, created incidents/events, optional member profile.
- `Member`: imported/community member register and patroller profile fields.
- `Vehicle`: registered vehicle master data used by patrol sessions.
- `PrePatrolChecklist`: pre-shift checks linked to user and optionally patrol session.
- `PatrolSession`: patrol shift/session, driver, vehicle, call sign, KM, status, crew/events.
- `PatrolSessionCrew`: crew membership for a patrol session.
- `PatrolEvent`: operational patrol events, incident response lifecycle entries, assistance, infrastructure, location, classification.
- `PatrolReportAuditLog`: audit trail for patrol report edits.
- `Incident`: operational incident report/response record.
- `Service`: service/contact-style coordination record.
- `IncidentServiceLog`: incident-to-service coordination log.
- `Organisation`: organisation register.
- `Sector`: future isolation boundary and master-register scope.
- `UserSectorAccess`: per-user sector permissions.
- `IncidentCode`: master incident code register.
- `IncidentSubcode`: master subcode register linked to incident code.
- `ServiceType`: master service category register.
- `InfrastructureType`: master infrastructure classification register.
- `EmergencyContactType`: master emergency contact classification register.
- `IntelligenceEntity`: VOI/intelligence entity.
- `VOIVehicleDetails`: vehicle-specific intelligence details.
- `PatrolEventVOILink`: patrol event to intelligence entity link.
- `IncidentVOILink`: incident to intelligence entity link.
- `IntelligenceLink`: graph relationship between intelligence entities.

## 11. Tables and Fields Critical for Mobile Patroller Workflow

Critical path:

- Login/current user: `User.id`, `User.email`, `User.passwordHash`, `User.role`, `User.isActive`.
- Patroller identity/profile: `Member.userId`, `Member.callSign`, `Member.patrolApproved`, `Member.patrolStatus`, `Member.patrolTraining`, `Member.sector`.
- Start patrol: `PatrolSession.userId`, `vehicleId`, `callSign`, `sector`, `startKm`, `status`, `vehicleMode`, temporary vehicle fields.
- Crew picker: `PatrolSessionCrew.patrolSessionId`, `memberId`, `userId`, `role`, `attendanceStatus`.
- Actions/forms: `PatrolEvent.type`, `incidentCodeId`, `incidentSubcodeId`, `serviceTypeId`, `infrastructureTypeId`, `referenceNumber`, `description`, `assistance`, location fields, `createdByUserId`.
- End patrol/report: `PatrolSession.endKm`, `totalKm`, `summary`, `status`, `endTime`.

## 12. Tables and Fields Critical for Control Room Live Operations

Critical path:

- Active patrols: `PatrolSession.status`, `callSign`, `sector`, `userId`, `vehicleId`, `startTime`, `crew`.
- Patrol timeline: `PatrolEvent.patrolId`, `createdAt`, `type`, `description`, classification refs, assistance, service/infrastructure refs, location.
- Assistance requests: `PatrolEvent.assistance`, `serviceTypeId`, `description`, location fields, `patrolId`.
- Incidents: `Incident.status`, `severity`, `source`, `linkedPatrolId`, `incidentCodeId`, `incidentSubcodeId`, `street`, `suburb`.
- Service coordination: `Service`, `IncidentServiceLog`.
- Reports/accountability: `PatrolReportAuditLog`, patrol report edit fields.

## 13. Tables and Fields Critical for Future Live Map

Critical fields:

- `PatrolEvent.latitude`, `PatrolEvent.longitude`, `streetNumber`, `streetName`, `suburb`, `locationNotes`, `createdAt`, `type`.
- `IntelligenceEntity.latitude`, `IntelligenceEntity.longitude`, `address`, `suburb`, `sector`, `entityType`, `riskLevel`, `status`.
- `Incident.street`, `Incident.suburb`, `Incident.sector`; note that `Incident` currently has no latitude/longitude columns.
- `PatrolSession.status`, `sector`, `callSign`, `userId`, `vehicleId`; note that patrol sessions currently have no live GPS position table.

Future map risk: location is mostly event-based, not continuously tracked. Hosted migration should preserve nullable coordinate fields and avoid assumptions that every incident or event has coordinates.

## 14. Migration Risks

- PostgreSQL version mismatch: local is PostgreSQL 18.3. Confirm hosted server supports dump/restore compatibility. If hosted PostgreSQL is older, use a compatible `pg_dump` strategy and test restore before cutover.
- Baseline migration row with `applied_steps_count = 0`: preserve `_prisma_migrations` exactly.
- Sector scoping is incomplete: many records use text sector fields while master registers use `sectorId`.
- Members dominate data volume and include imported resident/member records. Validate encoding, nullable fields, and contact data after restore.
- Authentication depends on password hashes. Do not regenerate users or hashes during migration.
- Assistance requests are not a table; they derive from `PatrolEvent.assistance`.
- Incident and patrol event classification refs are nullable; do not enforce new not-null constraints during hosting.
- Some relation deletes cascade. Do not seed over restored data or delete parent rows after restore.
- `pg_stat_user_tables` estimates were stale for some tables; use exact `COUNT(*)` checks for validation.
- Environment variables and Prisma `DATABASE_URL` must point to hosted database only after restore verification.

## 15. Backup Plan

Recommended backup:

```bash
pg_dump --format=custom --verbose --no-owner --no-acl --file=civitaswatch_live_$(date +%Y%m%d_%H%M%S).dump civitaswatch_live
```

Backup notes:

- Use custom format so the dump can be inspected and restored flexibly with `pg_restore`.
- Include `_prisma_migrations`; do not omit migration metadata.
- Keep a timestamped copy of the dump outside the application repo.
- Do not run application seed scripts against the restored database.
- Capture the source commit SHA and deployed environment variables at the same time as the final dump.

## 16. Restore Plan

Recommended restore to an empty hosted database:

```bash
pg_restore --verbose --clean --if-exists --no-owner --no-acl --dbname="$HOSTED_DATABASE_URL" civitaswatch_live_YYYYMMDD_HHMMSS.dump
```

Safer hosted cutover sequence:

1. Create hosted PostgreSQL database.
2. Confirm hosted PostgreSQL major version compatibility.
3. Take a custom-format `pg_dump` from local.
4. Restore into hosted staging database first.
5. Run `npx prisma validate --schema apps/api/prisma/schema.prisma`.
6. Run `npx prisma migrate status --schema apps/api/prisma/schema.prisma` against hosted staging.
7. Run exact table count checks against hosted staging and compare to this report.
8. Point API staging `DATABASE_URL` to hosted staging.
9. Smoke test login, dashboard, patrol reports, incident reports, assistance requests, master registers, and intelligence graph.
10. Schedule production cutover window.
11. Take final local backup.
12. Restore final dump to hosted production.
13. Switch production `DATABASE_URL`.
14. Keep the local dump and pre-cutover database untouched until hosted verification is complete.

## 17. Post-Restore Verification Checklist

Run after restore:

```bash
npx prisma validate --schema apps/api/prisma/schema.prisma
npx prisma migrate status --schema apps/api/prisma/schema.prisma
psql "$HOSTED_DATABASE_URL" -c "SELECT COUNT(*) FROM \"_prisma_migrations\";"
psql "$HOSTED_DATABASE_URL" -c "SELECT COUNT(*) FROM \"Member\";"
psql "$HOSTED_DATABASE_URL" -c "SELECT COUNT(*) FROM \"PatrolSession\";"
psql "$HOSTED_DATABASE_URL" -c "SELECT COUNT(*) FROM \"PatrolEvent\";"
psql "$HOSTED_DATABASE_URL" -c "SELECT COUNT(*) FROM \"Incident\";"
```

Expected core counts from local source:

- `_prisma_migrations`: 13
- `User`: 7
- `Member`: 3,114
- `Vehicle`: 2
- `PatrolSession`: 69
- `PatrolSessionCrew`: 68
- `PatrolEvent`: 161
- `Incident`: 40
- `IncidentCode`: 8
- `IncidentSubcode`: 18
- `ServiceType`: 6
- `InfrastructureType`: 6
- `EmergencyContactType`: 6
- `IntelligenceEntity`: 7
- `IntelligenceLink`: 12

Application verification:

- Admin login works with existing credentials.
- Patroller login works for existing patroller accounts.
- Members/registers load and search.
- Vehicles register loads.
- Patrol Reports show 69 sessions.
- Incident Reports show 40 incidents.
- Assistance request report/history resolves from `PatrolEvent.assistance`.
- Control Room local tabs still show active patrols, incidents, assistance requests, patrol reports, and selected timelines.
- Master register APIs load incident codes, incident subcodes, service types, infrastructure types, and emergency contact types.
- Intelligence entities and graph links load.
- No schema drift is reported by Prisma.

## 18. Recommended Server Database Setup Notes

- Use managed PostgreSQL where possible, with automated backups, point-in-time recovery, and monitoring enabled.
- Use a hosted PostgreSQL version compatible with the current local database and Prisma stack. PostgreSQL 16, 17, or 18 may be acceptable depending on the provider, but the dump must first be restored into a hosted staging database and validated before production cutover.
- Create a dedicated database and least-privilege application user for CivitasWatch.
- Use SSL/TLS database connections from the API server when supported by the provider.
- Store `DATABASE_URL` only in the server environment or secret manager; do not commit hosted credentials.
- Confirm timezone behavior. Local migration data uses timestamp columns without time zone for most application records; application display should continue to handle local operational time consistently.
- Set connection limits appropriate to the API runtime. Avoid exhausting managed database connection pools if the app is deployed with multiple Node processes.
- Enable daily automated backups and take a manual snapshot immediately before any future migration.
- Keep Prisma migration files deployed with the API so `prisma migrate status` can validate hosted state.
- Restrict direct database access by IP/VPN or provider firewall rules.
- Run `ANALYZE` after restore if hosted query estimates appear stale.
- Verify storage headroom despite the current 12 MB size; member imports, patrol events, reports, audit logs, and future live map history will grow.

## 19. Source Files Inspected

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations`
- `apps/api/src/routes/patrols.routes.js`
- `apps/api/src/routes/patrol-events.routes.js`
- `apps/api/src/routes/incidents.routes.js`
- `apps/api/src/routes/intelligence.routes.js`
- `apps/api/src/routes/admin.routes.js`
