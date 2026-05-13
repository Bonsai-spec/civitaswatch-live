# Master Registers Implementation Plan

## 1. Current Status

- Five master registers now have Prisma models:
  - Incident Codes
  - Incident Subcodes
  - Service Types
  - Infrastructure Types
  - Emergency Contact Types
- Admin CRUD APIs exist for all five registers.
- The Admin UI is connected to the backend APIs.
- Register data persists after refresh.
- A seed script exists for default global/template records:
  - `apps/api/scripts/seed-master-registers.js`
- A smoke test script exists for GET endpoint verification:
  - `apps/api/scripts/smoke-master-registers.js`

## 2. Completed Batches

- Batch 7: Prisma models
- Batch 8: migrations
- Batch 9-13: Admin CRUD APIs
- Batch 14-18: frontend API integration
- Batch 20: Patrol Incident Response uses Incident Codes/Subcodes
- Batch 24: seed script
- Batch 25: smoke test script

## 3. Implemented Backend Models

- Sector
- IncidentCode
- IncidentSubcode
- ServiceType
- InfrastructureType
- EmergencyContactType

## 4. API Endpoints

- `/api/admin/incident-codes`
- `/api/admin/incident-subcodes`
- `/api/admin/service-types`
- `/api/admin/infrastructure-types`
- `/api/admin/emergency-contact-types`

Each endpoint supports Admin CRUD and persisted records.

## 5. Frontend Integration

- The Admin master-register UI fetches records from the API.
- Add actions use `POST`.
- Inline edits use `PATCH`.
- Delete actions use `DELETE`.
- Local React state is synchronized after successful API responses.

## 6. Sector and Template Rules

- Register records should be scoped by sector.
- Master Admin can publish shared templates.
- Sectors can adopt or override shared templates.
- Patrol and Control Room should consume active-only values.

## 7. Next Integration Work

- Sector scoping
- Persist patrol incident classification IDs
- Control Room classification display
- Service Types in Patrol assistance requests
- Intelligence analytics

## 8. Verification Plan

- Run Prisma validation:

```bash
npx prisma validate --schema apps/api/prisma/schema.prisma
```

- Run syntax checks for API route files:

```bash
node --check apps/api/src/routes/admin.routes.js
```

- Run the seed script:

```bash
node apps/api/scripts/seed-master-registers.js
```

- Run the API smoke test when the API and token are available:

```bash
API_BASE_URL=http://localhost:4000 API_TOKEN=<token> node apps/api/scripts/smoke-master-registers.js
```

- Run the web build:

```bash
npm run build --workspace apps/web
```
