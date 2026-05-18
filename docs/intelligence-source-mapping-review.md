# CivitasWatch Phase 3 Intelligence Source Mapping Review

## 1. Executive summary

Current CivitasWatch already has a workable Intelligence foundation: analysts can create intelligence entities, create links between entities, promote incidents and patrol events into intelligence records, view linked incident/patrol context, and inspect relationships through a spider graph and geo map.

The operational source data needed for stronger Intelligence is mostly already present in existing records:

- Patrol events hold incident response updates, assistance requests, infrastructure reports, descriptions, structured location fields, coordinates, service types, infrastructure types, incident codes/subcodes, and creator details.
- Incidents hold formal incident records, SAPS incident code/subcode references, sector, severity, status, source, linked patrol, timestamps, street, and suburb.
- Patrol sessions hold call sign, sector, vehicle, driver, crew, start/end time, kilometres, and patrol status.
- Reports already derive monthly trends, patroller activity, assistance history, infrastructure reporting, vehicle usage, and incident summaries from current operational data.

Recommended direction: keep Intelligence as an analyst-controlled overlay. Do not automatically convert operational events into intelligence entities by default. First implementation should add safer source-record visibility and explicit “Promote to Intelligence” entry points from existing incident/patrol event detail views, using the already-existing backend promotion routes.

No Prisma schema changes are recommended before the mapping and permissions model are agreed.

## 2. Current Intelligence model

### IntelligenceEntity

`IntelligenceEntity` is the core profile record for the Intelligence workspace.

Current fields support:

- `entityType`
- `displayName`
- `description`
- `address`
- `suburb`
- `sector`
- `latitude`
- `longitude`
- `riskLevel`
- `status`
- timestamps
- VOI vehicle details
- incident links
- patrol event links
- outgoing/incoming intelligence links

Current backend entity types are:

- `PERSON`
- `VEHICLE`
- `LOCATION`
- `ORGANISATION`
- `INCIDENT_PATTERN`
- `RISK_LOCATION`
- `OTHER`

Current risk levels are:

- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

### IntelligenceLink

`IntelligenceLink` links one intelligence entity to another.

Current fields support:

- `fromEntityId`
- `toEntityId`
- `relationship`
- `strength`
- `notes`
- `createdAt`

The UI already uses these links in the spider graph. Relationship labels are displayed on the graph, and links can be deleted from the graph/detail view.

### VOIVehicleDetails

`VOIVehicleDetails` extends an `IntelligenceEntity` when the entity is a vehicle of interest.

Current fields support:

- registration number
- make
- model
- colour
- vehicle type
- distinguishing marks
- notes

This is separate from the operational `Vehicle` register. That is appropriate: registered patrol vehicles and suspicious/observed vehicles should not be mixed.

### IncidentVOILink

`IncidentVOILink` connects an `Incident` to an `IntelligenceEntity`.

Current fields support:

- source incident
- linked intelligence entity
- role in incident
- notes
- created timestamp

The backend already supports `POST /intelligence/promote/incident/:incidentId`, which creates an intelligence entity and links it to the incident.

### PatrolEventVOILink

`PatrolEventVOILink` connects a `PatrolEvent` to an `IntelligenceEntity`.

Current fields support:

- source patrol event
- linked intelligence entity
- observation type
- notes
- created timestamp

The backend already supports `POST /intelligence/promote/patrol-event/:patrolEventId`, which creates an intelligence entity and links it to the patrol event.

## 3. Source data that should feed Intelligence

### Patrol Events

Patrol events are the strongest Intelligence source because they contain field-level observations and structured context.

Useful fields:

- event type: `NOTIFIED`, `EN_ROUTE`, `ON_SCENE`, `STAND_DOWN`, `RESUME_PATROL`, `INFRASTRUCTURE`
- linked patrol
- linked incident
- incident code/subcode
- reference number
- street number
- street name
- suburb
- location notes
- latitude/longitude
- service type
- infrastructure type
- description
- assistance text
- scene active state
- creator
- created timestamp

Intelligence uses:

- field observations
- assistance demand patterns
- infrastructure fault clusters
- repeat places
- repeat incident classifications
- coordinates for map markers

### Incidents

Incidents are formal operational records and should feed Intelligence when they represent a person, vehicle, address, pattern, hotspot, or recurring risk.

Useful fields:

- incident code/reference
- title
- description
- sector
- status
- severity
- source
- linked patrol
- reported/occurred timestamps
- incident type
- incident code/subcode references
- street
- suburb
- created by

Intelligence uses:

- higher-confidence incident history
- recurring SAPS code patterns
- severity/risk context
- source patrol timeline
- incident-to-entity links

### Patrol Sessions

Patrol sessions provide operational context around events.

Useful fields:

- patrol call sign
- sector
- driver
- crew
- vehicle
- start/end times
- start/end/total KM
- status
- patrol events

Intelligence uses:

- who observed the event
- what patrol was active
- response timeline context
- sector and coverage context
- vehicle/patrol session relationship to event

### Vehicles

There are two vehicle concepts:

- Registered patrol vehicles in `Vehicle`
- Vehicles of interest in `VOIVehicleDetails`

Registered patrol vehicles are operational assets and should feed context for patrol coverage and event response. Vehicles of interest are analytical/intelligence entities.

Recommended mapping:

- Use registered vehicles for source context only.
- Use `VOIVehicleDetails` for suspect/repeated/observed vehicles.
- Avoid turning every registered patrol vehicle into a VOI.

### Members / Patrollers

Members and users identify drivers, crew, creators, and operational witnesses.

Useful fields from current source views:

- driver user
- crew user/member
- createdBy user
- full name
- email
- role
- member call sign where available from member records

Intelligence uses:

- source/witness context
- patrol timeline context
- accountability/audit context

Sensitive member data should not be exposed in Intelligence unless needed for source accountability.

### Emergency Assistance

Emergency assistance is currently stored as PatrolEvent data via the `assistance` field and optional `serviceTypeId`.

Intelligence uses:

- repeat assistance request locations
- repeat service demand
- recurring incident/service combinations
- response burden by area/time

Assistance resolution remains a Control Room/live operations concern. Intelligence should analyse history and patterns only.

### Infrastructure Reports

Infrastructure reports are stored as PatrolEvent records with `type === "INFRASTRUCTURE"` and/or `infrastructureTypeId`.

Intelligence uses:

- repeat infrastructure fault locations
- high-risk environmental conditions
- recurring street light/camera/road hazard issues
- correlation with incident hotspots

### Incident Codes / Subcodes

Incident codes and subcodes are the primary classification source for monthly trends and Intelligence patterning.

Intelligence should use:

- incident code number
- incident code name
- incident subcode
- incident subcode name
- priority where present

The SAPS code/subcode should remain visible. Broad categories must not replace the source classification.

### Reporting Clusters

Reporting clusters are an analytical overlay, not a replacement for SAPS incident codes.

Recommended Intelligence use:

- secondary grouping for dashboards
- high-level trend grouping
- cluster/subcluster filters
- risk summaries

Reporting clusters should be linked in application logic or reporting logic only after the mapping is reviewed. They should not be imported into the database in this review step.

### Location fields

Current location data exists across patrol events and incidents.

PatrolEvent location fields:

- street number
- street name
- suburb
- location notes
- latitude
- longitude

Incident location fields:

- street
- suburb
- sector

Intelligence uses:

- address/location entities
- repeat location detection
- suburb trend analysis
- sector risk
- geo map pins
- hotspot candidates

PatrolEvent currently has richer structured location fields than Incident.

## 4. Intelligence entity candidates

### Person / VOI

Candidate when:

- a person is repeatedly mentioned in incidents or patrol observations
- a person is associated with repeated suspicious activity
- an analyst manually identifies a person of interest

Source records:

- patrol event descriptions
- incident descriptions
- analyst notes

Risk: avoid exposing resident/member details unnecessarily.

### Vehicle / VOI

Candidate when:

- same registration appears in repeated patrol observations
- vehicle is linked to repeated incident locations
- vehicle is manually identified by analyst

Source records:

- patrol event description
- VOI vehicle details
- incident notes

Operational patrol vehicles should remain context, not VOIs.

### Location

Candidate when:

- same address/location appears repeatedly
- coordinate pin has multiple events
- recurring assistance or infrastructure demand occurs at same place

Source records:

- patrol event street/suburb/location notes/coordinates
- incident street/suburb

### Address

Candidate when:

- specific street number + street name repeats
- same premises has repeated alarms, suspicious activity, or assistance requests

Address entities may be useful as a more precise form of location entity.

### Incident hotspot

Candidate when:

- incident count increases month-to-month
- same SAPS incident code repeats in a suburb or street
- night-time activity concentrates in one area

Source records:

- incidents
- patrol events with incident code/subcode
- monthly report trend datasets

### Patrol event

Patrol events should remain source records, not general Intelligence entities by default.

Promote only when the event contains an intelligence-worthy observation, vehicle, person, address, pattern, or risk location.

### Organisation

Candidate when:

- a business, school, community organisation, service provider, or body corporate is tied to recurring events
- repeated incidents affect the same organisation

Source records:

- incident descriptions
- patrol event descriptions
- future organisation register links

### Infrastructure fault location

Candidate when:

- same infrastructure fault repeats
- infrastructure risk correlates with incidents
- location creates recurring safety risk

Source records:

- infrastructure patrol events
- infrastructure type/risk
- location notes and coordinates

## 5. Pattern detection opportunities

### Repeat locations

Detect repeated events at the same:

- street number + street name + suburb
- street name + suburb
- coordinate pair
- location note text, where structured fields are missing

Recommended output:

- “Repeat address detected”
- count
- latest event date
- incident codes involved
- linked patrol events/incidents

### Repeat suburbs

Group incidents and patrol events by suburb.

Useful for:

- monthly feedback
- sector planning
- community hotspot discussion

### Repeat incident codes

Group by SAPS incident code and name.

Example:

- `037 - Burglar Alarm`
- `038 - Suspicious Person`

This should be primary for safety trend reporting.

### Repeat incident code + suburb combinations

This is likely one of the highest-value monthly Intelligence outputs.

Example:

- `037 - Burglar Alarm / Valhalla`
- `038 - Suspicious Person / Sector 1`

### Repeat vehicles

Detect repeated vehicle registrations in Intelligence vehicle entities and free-text patrol observations where possible.

Near-term approach:

- start with analyst-created VOI vehicle records
- suggest possible matches by registration number
- avoid unreliable free-text extraction until reviewed

### Repeat assistance requests

Group assistance events by:

- location
- suburb
- sector
- service type
- patrol call sign
- time of day

This should support service demand trends without moving live resolution actions into Intelligence.

### Repeat infrastructure faults

Group infrastructure reports by:

- infrastructure type
- location
- suburb
- sector
- risk level
- month

Useful for municipal escalation and safety risk planning.

### Night-time vs daytime trends

Use current timestamps to derive:

- daytime: 06:00-17:59
- night-time: 18:00-05:59

Useful for:

- patrol coverage analysis
- monthly safety trends
- high-risk period identification

### Month-to-month increases

Use incident `reportedAt`/`occurredAt` and patrol event `createdAt`.

Recommended outputs:

- increase/decrease per incident code
- increase/decrease per incident code + suburb
- increase/decrease per reporting cluster once mapping is approved
- top increasing/decreasing risks

### High-risk sectors

Use `sector` from incidents and patrol sessions.

Recommended grouping:

- incidents by sector
- assistance by sector
- infrastructure faults by sector
- high/critical intelligence entities by sector
- night-time activity by sector

## 6. Manual vs automatic intelligence

### Manual intelligence

Manual analyst actions should remain the source of truth for intelligence classification.

Recommended manual actions:

- promote incident to intelligence
- promote patrol event to intelligence
- create VOI
- create vehicle of interest
- link entities
- set risk level
- set status/watchlist
- add analyst notes

Current backend already supports manual promotion from:

- incident
- patrol event

Current UI already supports:

- add entity
- edit entity
- archive entity
- create entity link
- accept/reject/ignore auto-link suggestions
- view linked incidents
- view linked patrol observations

### Automatic suggestions

Automatic behaviour should produce suggestions, not final intelligence classification.

Safe suggestion examples:

- repeat address detected
- same incident code repeated in suburb
- same vehicle appears multiple times
- same location has multiple assistance events
- same location has multiple infrastructure events
- same incident code increased month-to-month
- high-risk sector trend detected

Suggestions should require analyst approval before:

- creating a new entity
- linking records
- changing risk level
- marking anything as watchlist

## 7. Recommended Intelligence UI improvements

### Promote Patrol Event to Intelligence

Add a visible action from patrol event detail/timeline/report rows:

- “Promote to Intelligence”
- opens a prefilled form
- source remains linked through `PatrolEventVOILink`
- analyst chooses entity type, risk level, status, and notes

The backend route already exists.

### Promote Incident to Intelligence

Add a visible action from incident detail/report rows:

- “Promote to Intelligence”
- opens a prefilled form
- source remains linked through `IncidentVOILink`
- analyst chooses entity type, risk level, role in incident, and notes

The backend route already exists.

### Source record panel

Add a source panel inside Intelligence entity detail:

- source record type: incident or patrol event
- source ID/reference
- patrol call sign
- driver/creator
- incident code/subcode
- service/infrastructure type
- original description
- original location
- source timestamp

Purpose: analysts can see why the intelligence record exists without editing operational history.

### Linked patrol/incident timeline

Add a chronological timeline combining:

- linked incidents
- linked patrol events
- event status changes
- assistance requests
- infrastructure reports

Purpose: show the story around a VOI, address, or hotspot.

### Map markers from coordinates

Current geo map maps intelligence entities that have latitude/longitude.

Recommended improvement:

- show intelligence entity coordinates
- show linked patrol event coordinates
- show linked incident locations when coordinates become available
- distinguish entity markers from source-event markers

Do not implement continuous live patrol GPS tracking as part of this mapping batch.

### Spider graph relationship labels

Current spider graph already displays shortened relationship labels on links.

Recommended improvement:

- standardise relationship vocabulary
- show source link type: manual link, incident link, patrol observation link
- show confidence/strength visually
- show source date/age clearly

### Risk level filters

Current backend supports risk-level filtering on `/intelligence/entities`, and UI shows high/critical summary cards.

Recommended improvement:

- add explicit risk filter control in the Intelligence section
- add status filter control
- add entity type filter
- keep search available

## 8. Risks

### Sensitive resident/member data

Intelligence should not expose resident/member details unnecessarily.

Recommended guardrails:

- show only source accountability fields required for audit
- avoid broad member/resident profile exposure
- limit Intelligence access to approved roles

### Over-automation

Automatic pattern detection can create false confidence.

Recommended guardrails:

- automatic outputs are suggestions
- analyst approval required for VOI creation and entity linking
- risk level changes remain manual

### Source record auditability

Operational source records must remain auditable.

Recommended guardrails:

- Intelligence links should point back to source records
- do not copy/edit operational event history as if it were intelligence-only data
- preserve original patrol event and incident values

### Patrol and Control Room workflow stability

Intelligence work must not disrupt field capture or live operations.

Recommended guardrails:

- no changes to Patrol forms in this mapping step
- no changes to Control Room local tab flow
- no live dispatch actions in Intelligence

### Schema changes

No schema changes should be made until the mapping and permission model are agreed.

Possible future schema topics, only after review:

- suggestion records
- source-event marker types
- reporting cluster persistence
- structured observed vehicle extraction
- dedicated intelligence audit log

## 9. Recommended first implementation batch

Recommended small safe batch:

Add explicit “Promote to Intelligence” UI actions for existing Incident and Patrol Event detail contexts, using the already-existing backend promotion routes.

Scope:

- Add a Promote action to Incident report/detail rows where the user has Intelligence permission.
- Add a Promote action to Patrol Event timeline/report rows where the user has Intelligence permission.
- Open a prefilled modal/form with source fields displayed read-only.
- Analyst must choose entity type, risk level, status/notes, and confirm.
- On save, call existing promotion endpoint.
- Show linked source record in the Intelligence entity detail after promotion.

Why this batch first:

- It uses existing Prisma models.
- It uses existing API routes.
- It avoids migrations.
- It keeps classification manual.
- It makes current operational records feed Intelligence without disrupting Patrol, Control Room, or Reports.

Out of scope for first batch:

- automatic creation of intelligence entities
- schema changes
- GPS/live patrol tracking
- broad member/resident data exposure
- reporting cluster database import
- Control Room dispatch changes
