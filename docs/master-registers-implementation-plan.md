# Master Registers Implementation Plan

## 1. Current Status

- Five master registers exist in the Admin UI:
  - Incident Codes
  - Incident Subcodes
  - Service Types
  - Infrastructure Types
  - Emergency Contact Types
- They currently use frontend-only local React state.
- Data does not persist after page refresh.

## 2. Target Backend Models

- Sector
- IncidentCode
- IncidentSubcode
- ServiceType
- InfrastructureType
- EmergencyContactType

## 3. API Endpoints

- `/api/admin/incident-codes`
- `/api/admin/incident-subcodes`
- `/api/admin/service-types`
- `/api/admin/infrastructure-types`
- `/api/admin/emergency-contact-types`

Each endpoint should support sector-scoped CRUD when implemented.

## 4. Frontend Integration Steps

- Fetch sector-scoped register records on load.
- Use `POST` when adding records.
- Use `PATCH` when editing records.
- Use `DELETE` when deleting records.
- Keep local React state synchronized after successful API responses.

## 5. Sector and Template Rules

- Register records should be scoped by sector.
- Master Admin can publish shared templates.
- Sectors can adopt or override shared templates.
- Patrol and Control Room should consume active-only values.

## 6. Verification Plan

- Run Prisma validation:

```bash
npx prisma validate --schema apps/api/prisma/schema.prisma
```

- Run syntax checks for API route files:

```bash
node --check apps/api/src/routes/admin.routes.js
```

- Run the web build:

```bash
npm run build --workspace apps/web
```
