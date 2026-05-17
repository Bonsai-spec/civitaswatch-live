# Admin Dashboard, Registers, and Reports Alignment Review

## 1. Executive Summary

The current Admin area is partly aligned with the Phase 3 operating model: navigation already separates Dashboard, Operations, Registers, Reports, Intelligence, and Master Administration, and the persistent master registers for Incident Codes, Incident Subcodes, Service Types, Infrastructure Types, Emergency Contact Types, and Emergency Services are present.

The main misalignment is ownership. Admin Dashboard still renders operational incident/workload panels, Reports can still perform operational edits and close active patrols, Vehicle Reports are currently register data rather than historical vehicle activity, and several register screens have uneven CRUD/filter/delete behavior. Control Room is correctly protected by the local tab layout and must remain separate.

Recommended first implementation should be a UI-only navigation/dashboard cleanup that removes operational panels from the Admin Dashboard and keeps live operations under Operations/Control Room, without schema changes.

## 2. Current State Map

| Current section/page | Current role/permission access | Current purpose | Current data source/API | Current actions available | Problems / duplication / wrong ownership |
|---|---|---|---|---|---|
| Dashboard | `VIEW_DASHBOARD`; visible to ADMIN, MASTER_ADMIN, CONTROL_ROOM, SUPERVISOR, REPORTS, PATROLLER/PATROL, INTELLIGENCE_ANALYST by permission, but Control Room route content is suppressed into local tabs | Summary cards for incidents, patrols, organisations; also renders incidents section and patrol workload for non-Control Room users | `GET /admin/dashboard`; `useAdminData`; members from `GET /members`; assistance from patrol-events route for allowed roles | View summary, filter incident status via embedded IncidentsSection, incident operational actions if handlers are available | Admin Dashboard is overcrowded and still includes operational incident/workload content. Dashboard should summarize admin/source-of-truth state, not act as live operations. |
| Admin sidebar/navigation | Role-filtered by `PERMISSIONS_BY_ROLE` against `ADMIN_NAV_SECTIONS` | Groups Dashboard, Operations, Registers, Reports, Intelligence, Master Administration | `apps/web/src/navigation/admin.navigation.js`; `navigation.helpers.js` | Navigate by label | Structure is close to target. `Master Administration` is empty. Operations includes both `Patrol Operations` and `Patrols`; `Patrol Operations` is a mobile field workflow and should not be in Admin for ADMIN users unless explicitly needed for testing. |
| Operations / Incidents | `VIEW_INCIDENTS`; ADMIN, MASTER_ADMIN, CONTROL_ROOM, SUPERVISOR, PATROLLER/PATROL, INTELLIGENCE_ANALYST | Operational incident creation, assignment, status updates, service coordination display | `GET /admin/dashboard`, `/admin/incidents`, `/incidents`, service routes | Create, view, update status, assign/unassign patrol/vehicle, archive, delete | Correctly operational, but Admin Dashboard embeds this section. Incident Reports also reuse operational incident records and expose edit/delete from Reports. |
| Operations / Patrol Operations | `VIEW_PATROL_OPERATIONS`; PATROLLER/PATROL currently | Mobile patrol workflow: start/end patrol, crew picker, actions, incident response, assistance, infrastructure | `/patrols/me/active`, `/patrols/start`, `/patrols/:id/end`, `/patrol-events`, `/members`, `/vehicles`, `/admin/*-types` | Start/end patrol, select crew, submit events, request assistance, update incident lifecycle | This belongs to Patrol, not Admin. Keep out of Admin cleanup except preserving route behavior for patrollers. |
| Operations / Patrols | `VIEW_PATROLS`; ADMIN, MASTER_ADMIN, CONTROL_ROOM, SUPERVISOR | Active patrol status display | Dashboard patrol data | View active patrols | Correct as operations/read-only admin view, but live patrol monitoring primarily belongs in Control Room. Admin should either keep this as operational lookup or move it out of core Admin registers/reports. |
| Registers / Members | `VIEW_REGISTERS`; manage actions require `MANAGE_MEMBERS` | Source-of-truth member register | Members loaded through `GET /members`; writes through `POST/PATCH /members`, patroller login/status routes | Search, add, view profile, edit, approve patrol, create login, disable/enable | Good Admin ownership. Needs standardized filters: active/inactive, sector, role/patroller status. Disable is appropriate; hard delete route exists in API but UI uses disable. |
| Registers / Patrollers | `VIEW_REGISTERS`; manage actions require member management handlers | Patroller subset/directory derived from members | Same member dataset and `/members/:id/patroller-status` | Edit, approve patrol | Correct as Admin register view, but it duplicates Members and should be clearly a filtered view of Members. Needs consistent filters and empty state. |
| Registers / Vehicles | `VIEW_REGISTERS` | Vehicle register | Vehicle data from dashboard payload; likely vehicle API elsewhere | View, placeholder Edit alert | Correct Admin ownership. Edit is not implemented in this screen, no add/disable/delete, no active/sector filters. |
| Registers / Residents | `VIEW_REGISTERS`; manage actions require member management handlers | Imported resident records derived from members/import metadata | Member dataset | View profile, edit, disable/enable | Correct Admin/source-of-truth ownership if residents are imported members. Needs clearer distinction from Members and import/source metadata filters. |
| Registers / Organisations | `VIEW_REGISTERS`; ADMIN also has `VIEW_ORGANISATIONS` but nav uses only `VIEW_REGISTERS` | Organisation register | Dashboard `organisations`; Prisma `Organisation` and `Sector` exist | View table only | Correct Admin ownership. No add/edit/disable, no sector management UI. Potential duplication with future Administration / Organisations. |
| Registers / Emergency Services | `VIEW_REGISTERS`; API write roles ADMIN, MASTER_ADMIN; Control Room can read via local tab | Actual emergency service/contact records | `GET/POST/PATCH/DELETE /services`; delete deactivates | Add, inline edit, active toggle, deactivate, load inactive | Correct Admin register. Control Room should keep read-only directory. Needs search/filter by type/sector/active and clear distinction from Emergency Contact Types. |
| Registers / Incident Codes | `VIEW_REGISTERS` in UI; admin routes currently lack explicit auth/role middleware in inspected file | Master incident classification register | `GET/POST/PATCH/DELETE /admin/incident-codes`; Prisma `IncidentCode` | Add, inline edit, active toggle, hard delete | Correct Admin register. Delete should usually deactivate because incidents and patrol events may reference codes. Needs role enforcement confirmation, search/filter, sector filter, and safer delete semantics. |
| Registers / Incident Subcodes | `VIEW_REGISTERS` in UI; admin routes currently lack explicit auth/role middleware in inspected file | Child classification register linked to Incident Codes | `GET/POST/PATCH/DELETE /admin/incident-subcodes`; Prisma `IncidentSubcode` | Add, parent-code dropdown, inline edit, active toggle, hard delete | Correct Admin register. Delete should usually deactivate because incidents and patrol events may reference subcodes. Needs parent-code filter and sector filter. |
| Registers / Service Types | `VIEW_REGISTERS` in UI; admin routes currently lack explicit auth/role middleware in inspected file | Standard response/assistance categories | `GET/POST/PATCH/DELETE /admin/service-types`; Prisma `ServiceType` | Add, inline edit, control-room-managed toggle, active toggle, hard delete | Correct Admin register. Should feed Patrol assistance and Control Room coordination. Delete should usually deactivate once referenced by patrol events. |
| Registers / Infrastructure Types | `VIEW_REGISTERS` in UI; admin routes currently lack explicit auth/role middleware in inspected file | Asset/infrastructure classifications | `GET/POST/PATCH/DELETE /admin/infrastructure-types`; Prisma `InfrastructureType` | Add, inline edit, risk level, requires location, active toggle, hard delete | Correct Admin register. Delete should usually deactivate once referenced by patrol events. |
| Registers / Emergency Contact Types | `VIEW_REGISTERS` in UI; admin routes currently lack explicit auth/role middleware in inspected file | Contact/escalation category register | `GET/POST/PATCH/DELETE /admin/emergency-contact-types`; Prisma `EmergencyContactType` | Add, inline edit, escalation level, sector-specific, active toggle, hard delete | Correct Admin register. Not the same as Emergency Services records. Needs search/filter and deactivate-first behavior. |
| Reports / Incident Reports | `VIEW_REPORTS`; ADMIN, MASTER_ADMIN, SUPERVISOR, REPORTS | Historical incident records | Currently receives `filteredRegisterIncidents` from dashboard incidents | Refresh, view, edit, delete | Should be read/audit/report oriented. Edit/delete in Reports is risky and duplicates Incidents operational management. Needs report filters and view details; historical edits only through explicit audited correction flow. |
| Reports / Patrol Reports | `VIEW_REPORTS`; Control Room can also use reports inside local tabs | Patrol session history and audit | `GET /patrols/report/all`; update/audit/end patrol endpoints via `useReports` | Date/sector/vehicle/patroller/status filters, view, edit, audit, close active patrol | Strongest report implementation, but it mixes report viewing with live operational close/edit. Edits need explicit audit governance; closing active patrols belongs in Control Room/Operations, not Reports. |
| Reports / Assistance Requests | `VIEW_REPORTS` route; data from dashboard assistance requests | Assistance request history from patrol events | `GET /patrol-events/assistance/requests` through dashboard load for ADMIN/MASTER_ADMIN/CONTROL_ROOM | Refresh, view table | Uses active assistance queue source, not a distinct historical report endpoint/filter set. Needs date/status/sector/service filters and resolved/history support. |
| Reports / Vehicle Reports | `VIEW_REPORTS` route | Currently displays vehicle register rows | Dashboard `vehicles` | Refresh, view table | This is not yet a report. It should become vehicle activity/history: patrol usage, KM, incidents linked to vehicle, maintenance/availability later. Current table duplicates Vehicle Register. |
| Intelligence | `VIEW_INTELLIGENCE`; ADMIN, MASTER_ADMIN, INTELLIGENCE_ANALYST | Pattern analysis/entities/links/risk | Intelligence hooks/routes | Add/edit/delete entities, link graph/map | Correctly separate from Admin/Reports. Should remain outside Admin registers. |
| Control Room local tabs | CONTROL_ROOM role; route sections suppressed | Live overview, assistance, incidents, active patrols, emergency services, patrol reports, map | Dashboard, patrol reports, services, admin register read endpoints | Resolve assistance, dispatch/service coordination, read directories | Correct ownership. Must not be replaced by old route sections. Control Room may read registers but should not manage Admin registers. |

## 3. Target Admin Structure

Admin should own source-of-truth configuration and management data:

- Dashboard: admin summary cards only, such as member counts, active/inactive registers, vehicles, organisations, sectors, master register completion, and basic system health later.
- Members: full member CRUD, profile data, vetting, contact details, next of kin, training, active/inactive status.
- Patrollers: filtered member view for patrol eligibility, patrol approval, call sign, training, linked login.
- Vehicles: registered patrol vehicles, active/inactive status, assignment readiness, future maintenance metadata.
- Residents: imported resident/source records, with import metadata and active/inactive handling.
- Organisations: organisation records and links to sectors.
- Sectors: sector records and sector access should be Admin/Master Admin once UI exists.
- Emergency Services / Contacts: actual callable service/contact directory records.
- Incident Codes: master primary classifications.
- Incident Subcodes: child classifications linked to Incident Codes.
- Service Types: standardized assistance/response categories.
- Infrastructure Types: standardized infrastructure classifications.
- Emergency Contact Types: escalation/contact category taxonomy.
- User access / permissions: planned Administration area for users, roles, permissions, and sector access.

## 4. Target Reports Structure

Reports should own historical records, accountability, filtering, and export views:

- Incident Reports: historical incidents with date, sector, status, severity, incident code/subcode, source, patrol, and service coordination filters.
- Patrol Reports: patrol sessions, driver, crew, vehicle, call sign, sector, KM, status, timeline, and audit history.
- Assistance Request Reports: historical assistance requests including active/resolved status, service type, reference number, patrol, location, and timestamps.
- Vehicle Reports: vehicle usage history, patrol sessions by vehicle, KM totals, incidents/events linked to vehicle, future maintenance/availability history.
- Infrastructure Reports later: infrastructure patrol events grouped by type, risk, sector, location, and status.
- Audit history: report corrections and operational changes should be visible, filterable, and exportable.
- Export/print views: CSV first; PDF/print-friendly views later.

Reports should not be the normal place to perform live operational actions. Corrections to historical data should be explicit, permissioned, and audited.

## 5. What Must Not Be in Admin

- Live active patrol dispatch operations.
- Live assistance queue management.
- Control Room dispatch panels.
- Patrol mobile forms and patrol action capture.
- Intelligence analysis screens, entity linking, maps, risk scoring, and pattern analysis.
- Direct Patrol-to-service dispatch workflows that bypass Control Room.

## 6. Register Behaviour Standard

Every register should converge on the same behavior:

- Add: available where the role can manage the register.
- Edit: available for configuration/source-of-truth records with validation.
- Disable/deactivate: preferred over hard delete where incidents, patrol events, service logs, or reports may reference the value.
- Delete: only for drafts or records proven safe to remove.
- Search/filter: consistent search field plus meaningful field filters.
- Active/inactive filter: standard for all registers with active flags.
- Sector filter: standard where records are sector-scoped or sector-labeled.
- Export CSV later: useful for admin audit and offline checks, but not required in first cleanup.
- Validation: required fields, uniqueness feedback, parent-child constraints, and friendly API error display.
- Empty states: clear "no records configured" or "no matching records" states per filtered view.

Current register gaps:

- Master registers have add/edit/active toggles but use hard delete except Emergency Services.
- Members/Residents support disable/enable; Vehicles and Organisations lack full management actions in the current UI.
- Register search is shared, but active/sector/type filters are not standardized.
- API role enforcement should be confirmed for admin register routes because the inspected `admin.routes.js` register endpoints do not show route-level `requireAuth`/`requireRole` middleware.

## 7. Reports Behaviour Standard

Every report should converge on:

- Date filter.
- Sector filter.
- Status filter.
- Patrol call sign filter where patrol data is involved.
- Driver/crew filter where useful.
- Incident code/subcode filter for incident and patrol-event reports.
- Service type filter for assistance/service reports.
- Vehicle filter for patrol and vehicle reports.
- Export CSV/PDF later.
- View details.
- Print/export later.
- No accidental editing of historical records unless explicitly allowed through an audited correction workflow.

Current report gaps:

- Patrol Reports have the strongest filter set and audit support.
- Incident Reports lack report-specific filters and currently expose operational edit/delete.
- Assistance Requests show history-like data but come from the active assistance queue source.
- Vehicle Reports are currently a duplicate of the Vehicle Register, not a historical report.

## 8. Recommended Navigation Structure

Proposed clean sidebar:

- Dashboard
  - Overview
  - System Health / Counts later
- Operations
  - Incidents
  - Patrols
- Registers
  - Members
  - Patrollers
  - Vehicles
  - Residents
  - Organisations
  - Sectors
  - Emergency Services
  - Incident Codes
  - Incident Subcodes
  - Service Types
  - Infrastructure Types
  - Emergency Contact Types
- Reports
  - Incident Reports
  - Patrol Reports
  - Assistance Requests
  - Vehicle Reports
  - Infrastructure Reports later
  - Audit History later
- Intelligence
  - Intelligence
- Administration
  - Users / Permissions later
  - Sector Access later
  - Master Templates later

Notes:

- `Patrol Operations` should remain a Patrol landing/workflow route, not a normal Admin sidebar item for ADMIN users.
- `Master Administration` should either be renamed to `Administration` with planned items or hidden until populated.
- Organisations should appear once. If retained in Registers, do not duplicate under Administration unless Administration is about user/permission governance.

## 9. Current -> Target Change List

| Item | Target action | Notes |
|---|---|---|
| Dashboard cards | Keep, then narrow | Keep high-level counts, remove embedded operational IncidentsSection/workload from dashboard. UI-only first. |
| Dashboard incident/workload panels | Move | Move to Operations / Incidents and Operations / Patrols or keep in Control Room local tabs. UI-only. |
| Admin navigation grouping | Keep/rename | Structure is close. Rename `Master Administration` to `Administration` or hide empty section. UI-only. |
| Patrol Operations route | Move/limit | Keep for PATROLLER/PATROL workflow. Do not expose as Admin management. UI/permission only. |
| Incidents | Keep under Operations | Live incident management belongs under Operations and Control Room. Reports should not duplicate edit/delete. UI/API later for report-specific endpoint. |
| Patrols admin view | Keep under Operations | Treat as read-only operational lookup for Admin; Control Room remains primary live monitor. UI-only unless new filters needed. |
| Members | Keep as register | Needs standardized filters and consistent disable behavior. UI/API polish. |
| Patrollers | Keep as register | Make clear it is a filtered member view. UI-only initially. |
| Vehicles | Keep as register | Needs real add/edit/disable UI and API integration if not already available. API/UI change likely, no schema change if existing Vehicle model is enough. |
| Residents | Keep as register | Needs clearer import/source filters. UI-only if data already exists on Member. |
| Organisations | Keep as register | Needs add/edit/disable later. API/UI change likely, no schema change if existing Organisation/Sector models are enough. |
| Sectors | Needs new component | Schema exists. UI/API review needed before implementation. |
| Emergency Services | Keep as register | Correct; standardize filters and deactivate behavior. UI-only/API polish. |
| Incident Codes | Keep as register | Replace hard delete with deactivate-first behavior. UI/API change. No schema change needed for active flag. |
| Incident Subcodes | Keep as register | Replace hard delete with deactivate-first behavior. UI/API change. No schema change needed. |
| Service Types | Keep as register | Replace hard delete with deactivate-first behavior. UI/API change. No schema change needed. |
| Infrastructure Types | Keep as register | Replace hard delete with deactivate-first behavior. UI/API change. No schema change needed. |
| Emergency Contact Types | Keep as register | Replace hard delete with deactivate-first behavior. UI/API change. No schema change needed. |
| Incident Reports | Convert to report | Remove default edit/delete from Reports; add filters and detail view. UI/API later. |
| Patrol Reports | Keep as report | Keep view/audit. Move live close action out of Reports. Keep audited correction only if explicitly permissioned. UI-only/API policy. |
| Assistance Requests | Convert to report | Needs historical/resolved report source and filters. API change may be needed. |
| Vehicle Reports | Convert to report | Replace vehicle register duplicate with vehicle usage/history report. Needs API change; no schema change unless maintenance/history is added later. |
| Export buttons | Add placeholders later | UI-only placeholders first; CSV implementation later. |
| Permissions | Tighten | Do not expose Admin Registers to CONTROL_ROOM. Confirm backend role middleware on Admin register APIs. API/middleware change likely. |

## 10. Implementation Batches

Batch 1: Admin navigation and dashboard cleanup

- Hide or rename empty `Master Administration`.
- Keep Admin Dashboard to summary cards only.
- Remove embedded operational IncidentsSection/workload from the Dashboard route.
- Ensure Control Room local tabs remain untouched.

Batch 2: Registers layout standardization

- Standardize register header, search, active filter, sector filter placeholders, and empty states.
- Keep existing APIs and data models.

Batch 3: Reports section structure

- Standardize report headers and filters per report category.
- Remove operational edit/delete/close actions from default report tables unless an audited correction mode is explicitly selected.

Batch 4: Filters/search/export placeholders

- Add consistent date/status/sector/patrol/driver/vehicle/code filters where data already supports them.
- Add disabled or planned CSV/PDF controls only where appropriate.

Batch 5: Delete/deactivate safety rules

- Convert master-register hard delete flows to deactivate-first where historical references may exist.
- Keep hard delete only for unsaved drafts or safe unreferenced records.

Batch 6: Final dashboard summary cards

- Add stable Admin summary cards for members, patrollers, vehicles, residents, organisations, sectors, and register completeness.
- Add system health/counts later if useful.

## 11. Risks

- Do not break Control Room local tab layout.
- Do not expose Admin Registers to CONTROL_ROOM.
- Do not delete records referenced by incidents or patrol events.
- Do not change Prisma schema unless necessary.
- Do not break Patrol mobile UI.
- Do not confuse Incident Reports with Incident Codes.
- Do not confuse Emergency Contact Types with Emergency Services contact records.
- Do not move live assistance handling into Admin.
- Do not remove audited patrol report correction capability without replacing the intended correction workflow.
- Confirm backend authorization before relying on frontend navigation visibility.

## 12. Recommended First Implementation Batch

Start with Batch 1 only: Admin navigation and dashboard cleanup.

Scope should be UI-only:

- Keep the sidebar groups but hide or rename the empty `Master Administration` section.
- Keep `Dashboard` as the landing page for ADMIN/MASTER_ADMIN.
- Remove the embedded operational incident list/workload from Admin Dashboard so it becomes a clean summary page.
- Leave `Operations / Incidents`, `Operations / Patrols`, Control Room local tabs, Patrol mobile workflow, Prisma schema, and APIs unchanged.

Verification for that future batch should be:

- `npm run build --workspace apps/web`
- Manual check that CONTROL_ROOM still opens the local Control Room tab layout.
