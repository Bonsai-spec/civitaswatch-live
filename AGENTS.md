# CivitasWatch Agent Instructions

## Project Overview

CivitasWatch is a multi-sector community safety platform.

Current phase:
Phase 3 — Patrol, Control Room, Admin Master Registers, and Sector Architecture.

The platform supports:
- Patroller mobile workflows
- Control Room coordination
- Admin configuration
- Master register management
- Multi-sector isolation
- Central Intelligence oversight

## Development Style

Work in small, focused batches.

For every implementation batch:
1. Keep scope narrow.
2. Verify with the correct command.
3. Commit after successful verification.
4. Do not mix unrelated changes.
5. Prefer fixing the frontline workflow before adding new architecture.

## Current Operational Model

### Patrol

Patrol is mobile-first.

One active patrol session means:
- One logged-in driver / patroller
- One registered vehicle
- One manually typed patrol call sign
- Optional crew members
- One sector
- Start KM
- Patrol status

Driver is always the logged-in user.

Crew members are selected separately and must not replace the driver.

Crew selection must be mobile-friendly:
- Do not show huge checkbox lists for large sectors.
- Use search/add/remove style crew picker.
- Payload should remain crewIds array.

### Patrol Call Signs

There are two different call signs:

1. Member call sign
   - Permanent identifier for a person.
   - Example: WC22.
   - Future login may support call sign + password.

2. Patrol session call sign
   - Manually typed for the current patrol shift.
   - Example: Bravo 1 or Sector 1 Alpha.
   - Stored on PatrolSession.callSign.

Do not confuse these two.

### Patrol Actions

Patrol actions include:
- Emergency
- Incident Response
- Observation
- Infrastructure

Descriptions must remain free text.

Register values must be dropdown classifications, not descriptions.

### Incident Response

Incident Response should use:
- Incident Code dropdown
- Incident Subcode dropdown
- Optional Reference Number
- Free-text Description
- Location fields

Lifecycle statuses:
- NOTIFIED
- EN_ROUTE
- ON_SCENE
- STAND_DOWN
- RESUME_PATROL

Do not show lifecycle status dropdowns on every patrol form.

Use a separate incident status action panel only when there is an assigned/active incident response.

### Location Fields

Patrol forms should align around:
- Street Number
- Street Name
- Suburb
- Landmark / Location Notes
- Latitude
- Longitude

Coordinates are optional.

Street Name or Location Notes should be enough for submission.

## Control Room

CONTROL_ROOM must always use the local Control Room tab layout.

Do not reintroduce old route sections for CONTROL_ROOM.

Control Room coordinates external services.

Patrollers request assistance through Control Room only.

Control Room must show:
- Active patrols
- Call sign
- Driver
- Crew
- Vehicle
- Sector
- Patrol status
- Assistance requests
- Incidents
- Patrol reports
- Selected patrol timeline

Control Room is the primary place to monitor live patrol status.

## Admin

Admin separates operational records from configuration registers.

Operational records:
- Incident Reports
- Patrol Reports
- Assistance Requests
- Active patrol data

Master registers:
- Incident Codes
- Incident Subcodes
- Service Types
- Infrastructure Types
- Emergency Contact Types

Incident Reports are not the same as Incident Codes/Subcodes.

## Master Registers

Master registers are now backed by:
- Prisma models
- PostgreSQL migrations
- Admin CRUD APIs
- Admin UI API integration

They persist after refresh.

Incident Codes/Subcodes are used by Patrol Incident Response.

Service Types will be used by Patrol assistance and Control Room coordination.

Infrastructure Types classify monitored assets and infrastructure reports.

Emergency Contact Types classify escalation/contact structures.

## Sector Architecture

CivitasWatch is moving toward sector-based isolation.

Each sector may have:
- Own members
- Own vehicles
- Own patrols
- Own master register values
- Own operational records

Master Admin may provide shared templates.

Central Intelligence may aggregate standardized data across sectors.

## Authentication

Current login uses email and password.

Future desired model:
- Admin: email + password
- Patroller: member call sign + password or PIN

Do not change authentication unless explicitly requested.

## Security Direction

Future security enhancements may include:
- Password expiry
- Failed login tracking
- Account lockout
- Forced password change
- Role-based login controls

Do not implement security schema changes unless explicitly requested.

## Current Known Issues / Next Priorities

Before adding large features, test frontline workflows.

Known next work:
1. Verify Patrol crew picker after /members permission fix.
2. Persist patrol incidentCodeId and incidentSubcodeId into backend incident/patrol records.
3. Display Incident Code/Subcode in Control Room.
4. Use Service Types for Patrol assistance.
5. Persist structured reference/location fields.
6. Improve Control Room Active Patrol status display.
7. Continue sector scoping.

## Verification Commands

Use the relevant checks:

Prisma:
npx prisma validate --schema apps/api/prisma/schema.prisma
npx prisma migrate status --schema apps/api/prisma/schema.prisma

API route syntax:
node --check apps/api/src/routes/admin.routes.js
node --check apps/api/src/routes/members.routes.js
node --check apps/api/src/routes/patrols.routes.js
node --check apps/api/src/routes/patrol-events.routes.js
node --check apps/api/src/routes/incidents.routes.js

Web:
npm run build --workspace apps/web

Scripts:
node --check apps/api/scripts/seed-master-registers.js
node --check apps/api/scripts/smoke-master-registers.js

## Rules

Do not:
- Change schema without migration and validation.
- Reset the database unless explicitly instructed.
- Remove existing operational functionality.
- Change Control Room routing behavior.
- Reintroduce old route sections for CONTROL_ROOM.
- Mix unrelated features in one batch.
- Create users unless explicitly requested.
- Modify reset-user-password.js unless explicitly requested.

Always:
- Keep batches small.
- Verify before committing.
- Commit after successful batches.
- Preserve backward compatibility where possible.
- Prefer frontend workflow testing before schema changes.
