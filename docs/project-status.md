# CivitasWatch Project Status Handoff

Last updated: 2026-05-14

## Phase 3 Status

CivitasWatch Phase 3 is in active integration. The core master-register foundation is now persisted, connected to Admin UI workflows, and partially consumed by Patrol and Control Room flows.

The current working focus is closing the remaining gaps between register configuration, patrol capture, Control Room visibility, and sector-scoped operational behavior.

## Completed Batches

- Batch 7: Added Prisma models for master registers.
- Batch 8: Added master-register migrations.
- Batch 9: Added Incident Codes Admin CRUD API.
- Batch 10: Added Incident Subcodes Admin CRUD API.
- Batch 11: Added Service Types Admin CRUD API.
- Batch 12: Added Infrastructure Types Admin CRUD API.
- Batch 13: Added Emergency Contact Types Admin CRUD API.
- Batch 14: Connected Incident Codes register UI to the Admin API.
- Batch 15: Connected Incident Subcodes register UI to the Admin API.
- Batch 16: Connected Service Types register UI to the Admin API.
- Batch 17: Connected Infrastructure Types register UI to the Admin API.
- Batch 18B: Connected Emergency Contact Types register UI to the Admin API.
- Batch 19: Added automatic sector scoping to master-register APIs.
- Batch 20: Integrated master registers into patrol incident response.
- Batch 21: Persisted incident classification references.
- Batch 22: Displayed incident classifications in Control Room.
- Batch 24: Added the master-register seed script.
- Batch 25: Added the master-register API smoke test script.
- Batch 26: Improved persisted master-register UX.
- Batch 27: Updated master-register persistence documentation.
- Batch 29 / 29A: Persisted patrol incident classification references and improved patrol crew member lookup.
- Batch A2: Aligned patrol crew selection and manual call sign behavior.
- Batch A3: Allowed patrol crew member lookup.
- Batch A4: Cleaned patrol forms, added reference and location fields, improved mobile crew picker/status actions, and aligned Control Room visibility.
- Batch A5: Aligned patrol forms with registers and location fields.

Recent fixes after A5:

- Fixed patrol mobile workflow regression.
- Fixed patrol crew selection permissions.

## Current Capabilities

- Admin master-register data persists through Prisma and PostgreSQL.
- Admin CRUD routes exist for:
  - Incident Codes
  - Incident Subcodes
  - Service Types
  - Infrastructure Types
  - Emergency Contact Types
- The Admin Registers UI loads, creates, updates, and deletes persisted register rows.
- Patrol incident response can load active register values and send incident code/subcode references.
- Incident and PatrolEvent records can store `incidentCodeId` and `incidentSubcodeId`.
- Control Room can display persisted incident classifications.
- Seed and smoke-test scripts exist for master-register baseline verification.

## Known Issues and Gaps

- Patrol location fields are still noted for future structured persistence in PatrolEvent metadata.
- Patrol reference number, `serviceTypeId`, and `infrastructureTypeId` are still noted for future API persistence.
- Service Types and Infrastructure Types are available to Patrol UI, but the remaining backend persistence path for their IDs still needs to be completed.
- Emergency Contact Types are persisted in Admin but are not yet broadly consumed by operational workflows.
- Master template inheritance and sector override behavior are represented in the data model, but the full governance workflow still needs product/API/UI completion.
- Smoke testing requires a running API and a valid API token; it is not a standalone offline check.

## Next Recommended Batches

- Batch B1: Persist structured PatrolEvent location metadata for incident, assistance, and infrastructure workflows.
- Batch B2: Persist service type and infrastructure type IDs end-to-end from Patrol capture through Control Room display.
- Batch B3: Add Control Room workflows for service coordination using Service Types and reference numbers.
- Batch B4: Implement Emergency Contact Type consumption in relevant sector/admin/contact workflows.
- Batch B5: Complete master template publishing, sector adoption, override, and active-only consumption rules.
- Batch B6: Add focused smoke or integration coverage for Patrol -> Incident -> Control Room classification persistence.
- Batch B7: Review and refresh older architecture comments/docs that still describe implemented register models as future work.

## Verification Commands

Documentation-only changes do not require an application build. For the current Phase 3 implementation, useful verification commands remain:

```bash
npx prisma validate --schema apps/api/prisma/schema.prisma
node --check apps/api/src/routes/admin.routes.js
node apps/api/scripts/seed-master-registers.js
API_BASE_URL=http://localhost:4000 API_TOKEN=<token> node apps/api/scripts/smoke-master-registers.js
npm run build --workspace apps/web
```
