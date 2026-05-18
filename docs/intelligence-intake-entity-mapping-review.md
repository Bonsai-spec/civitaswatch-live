# CivitasWatch Phase 3 Intelligence Intake and Entity Mapping Review

## 1. Executive Summary

Intelligence will only be useful if CivitasWatch captures structured source data at the moment information enters the system. Free-text descriptions are still important, but they are not enough for repeat detection, entity matching, source reliability, month-to-month trends, or defensible analyst decisions.

Core principle:

- Capture once at source.
- Preserve the operational source record.
- Link source records into Intelligence.
- Do not duplicate operational records as separate intelligence data.
- Do not automatically turn every report into intelligence.
- Analyst decides what becomes intelligence.

The current system already supports the core operational backbone:

- patrol sessions, crew, vehicles, status timeline, and KM
- patrol events for incidents, observations, assistance, and infrastructure
- incidents with SAPS code/subcode references
- structured patrol event location fields
- emergency assistance events
- infrastructure reports
- IntelligenceEntity, IntelligenceLink, VOIVehicleDetails
- IncidentVOILink and PatrolEventVOILink
- manual promotion from incidents and patrol events into Intelligence

Current gap: Intelligence entities can store generic profile fields and VOI vehicle details, but source reliability, verification status, confidence level, POI-specific details, richer location attributes, premises type, direction of travel, external source details, and link confidence are not first-class structured fields yet. These should not be rushed into schema changes. The next step should improve source intake and promotion UI using existing fields first, while clearly marking future fields that require review.

## 2. Source Channels

### A. Patrol source

Patrol is the most immediate field source. It can provide direct observations, structured location fields, timestamps, patrol context, and officer/patroller accountability.

Source types:

- Incident Response
- Observation
- Emergency Assistance
- Infrastructure Report
- End Patrol summary
- Patrol status/timeline
- Patroller free-text observation

Current useful data:

- patrol ID and patrol session call sign
- driver and crew
- vehicle
- sector
- event type
- SAPS incident code/subcode
- reference number
- service type
- infrastructure type
- description
- assistance text
- street number, street name, suburb
- landmark/location notes
- latitude/longitude
- created timestamp
- created by

Trust level:

- Direct field observation by patrol: medium to high, depending on visibility and detail.
- Patrol-entered third-party report: medium or low unless verified.
- Patrol event status/timeline: high for operational audit, not necessarily high for intelligence meaning.

Needs verification:

- person identity
- vehicle registration if partial or captured under stress
- cause/motive
- link between a person/vehicle and an incident
- external claims repeated by a patroller

Mark unverified:

- suspected POI
- partial vehicle registration
- anonymous information relayed to patrol
- behavioural interpretation not directly observed

Promote manually:

- repeat suspicious vehicle
- person description associated with repeated incidents
- specific address/location with repeated activity
- infrastructure fault linked to safety risk
- incident pattern from repeated SAPS code/suburb/time data

### B. Control Room source

Control Room is the live coordination layer. It may receive information that is not captured by patrol directly, especially public reports, radio/WhatsApp reports, and service coordination notes.

Source types:

- Assistance request handling
- Incident coordination notes
- External service contact notes
- Call received from public/member
- Radio/WhatsApp report
- Escalation notes
- Resolution notes

Current useful data:

- assistance request from PatrolEvent
- linked patrol
- active incident context
- emergency service directory lookup
- incident service logs where incident services are used

Current limitations:

- Control Room notes, external caller details, WhatsApp/radio source, escalation notes, and resolution notes are not consistently structured source fields.

Trust level:

- Official service reference: high or official.
- Direct call from known member: medium to high.
- WhatsApp/radio relay: low to medium.
- Anonymous public report: low until verified.

Needs verification:

- caller identity
- exact address
- vehicle registration
- person identity
- incident classification
- whether external service was actually dispatched

Mark unverified:

- public tip-offs
- WhatsApp claims
- anonymous calls
- second-hand descriptions

Promote manually:

- repeated callers/report locations
- repeated assistance demand at same location
- external service reference tied to serious incident
- public report later confirmed by patrol or SAPS

### C. Admin source

Admin source data is reference/master data, not intelligence by itself.

Source types:

- Member/patroller records
- Vehicle register
- Emergency Services contacts
- Organisations/sectors
- Master registers

Current useful data:

- member name, call sign, sector, training, patrol approval
- registered patrol vehicles
- emergency services contacts
- incident codes/subcodes
- service types
- infrastructure types
- organisation names/codes
- sector definitions

Trust level:

- Admin-managed master data: high for configuration and internal records.
- Member/resident personal information: sensitive and should not automatically feed Intelligence.

Needs verification:

- whether an operational vehicle is a VOI; registered patrol vehicles should not be treated as suspicious.
- whether an organisation/premises is intelligence-relevant.

Mark unverified:

- none by default; Admin records should either be source-of-truth records or inactive/incorrect records needing admin correction.

Promote manually:

- organisation/premises linked to recurring incidents
- contact entity only if allowed and operationally relevant
- infrastructure classification used in recurring risk patterns

### D. Reports source

Reports are derived history/accountability views. They should feed Intelligence as pattern suggestions, not automatic entity creation.

Source types:

- Monthly trends
- repeat incident codes
- repeat locations
- patroller activity
- infrastructure trends
- assistance demand

Current useful data:

- incident code/subcode trends
- suburb/sector counts
- code by suburb matrix
- top repeat locations
- assistance request history
- infrastructure detail and summary
- patroller activity and vehicle usage

Trust level:

- Aggregated counts from system records: high for data present in the system.
- Analytical conclusions: medium until reviewed.

Needs verification:

- whether a trend is operationally meaningful
- whether a hotspot is caused by better reporting rather than more activity
- whether a repeat location is a true same place or inconsistent free-text

Mark unverified:

- suggested patterns before analyst review
- possible hotspot
- possible repeat vehicle/person matches

Promote manually:

- repeat hotspot
- increasing incident code in a suburb
- recurring assistance request location
- recurring infrastructure fault location
- code/time-of-day pattern that LE agrees is meaningful

### E. External/community source

External/community data can be valuable but must be clearly marked and verified.

Source types:

- WhatsApp group report
- SAPS reference/case number
- community member report
- CCTV report
- security company report
- municipal reference
- anonymous tip-off

Current useful data:

- can be entered indirectly through incident descriptions, patrol event descriptions, assistance reference number, or future Control Room notes.

Current limitations:

- no standard external source type
- no source reliability field
- no verification status field
- no original reporter field with privacy controls
- no attachment/media model

Trust level:

- SAPS/municipal reference: official for reference existence, not necessarily full incident facts.
- CCTV report: medium to high if footage is available and reviewed.
- known community member: medium.
- anonymous tip-off: low.
- WhatsApp group report: low to medium.

Needs verification:

- all identities
- all vehicle registrations
- exact locations
- causal links
- suspect claims

Mark unverified:

- all external/community claims until confirmed by patrol, Control Room, SAPS, CCTV, or another approved source.

Promote manually:

- external source corroborated by patrol/SAPS/CCTV
- repeated independent reports about same vehicle/person/location
- official reference attached to a serious or recurring incident

## 3. Core Intelligence Entity Types

### A. Person of Interest / POI

Purpose: represent a person who is analytically relevant, not every resident/member/patroller.

Fields to consider:

- full name, if known
- alias/nickname
- gender, if relevant and lawful
- approximate age or age band
- physical description
- clothing description
- distinguishing marks
- behaviour observed
- known associates
- contact details only if lawful/approved
- risk level
- status: active, monitoring, archived, cleared
- source records
- notes
- confidence level
- verification status

Current support:

- `IntelligenceEntity.entityType = PERSON`
- display name
- description
- address/suburb/sector
- risk level/status
- source links to incidents/patrol events
- free-text notes via description/link notes

Current gaps:

- no structured POI details
- no confidence level
- no verification status
- no lawful contact-details control
- no source reliability
- no separate alias/age/clothing/behaviour fields

### B. Vehicle of Interest / VOI

Purpose: represent a vehicle observed in suspicious, repeated, or relevant contexts. This is separate from registered patrol vehicles.

Fields to consider:

- registration number
- partial registration
- make
- model
- colour
- vehicle type
- year if known
- distinguishing marks
- damage
- stickers/decals
- occupants count
- direction of travel
- last seen location
- last seen date/time
- linked persons
- linked incidents
- linked patrol events
- risk level
- status
- confidence level
- verification status

Current support:

- `IntelligenceEntity.entityType = VEHICLE`
- `VOIVehicleDetails.registrationNumber`
- make/model/colour/vehicle type
- distinguishing marks
- notes
- risk/status
- incident/patrol event links
- entity links

Current gaps:

- no partial registration field
- no year/damage/stickers/occupants/direction fields
- no last seen fields except through linked source records
- no confidence/verification status
- no source reliability

### C. Place of Interest / Location of Interest

Purpose: represent a place, address, premises, hotspot, or location that needs monitoring.

Fields to consider:

- place name
- street number
- street name
- suburb
- sector
- landmark/location notes
- latitude
- longitude
- premises type: house, business, school, park, shopping centre, street corner, infrastructure point
- repeated incident codes
- time-of-day pattern
- risk level
- status
- linked incidents
- linked patrol events
- linked persons/vehicles
- confidence level
- verification status

Current support:

- `IntelligenceEntity.entityType = LOCATION` or `RISK_LOCATION`
- display name
- address
- suburb
- sector
- latitude/longitude
- risk/status
- incident/patrol event links

Current gaps:

- no separate street number/street name on IntelligenceEntity
- no premises type
- no structured time-of-day pattern
- no repeat count
- no confidence/verification status

### D. Organisation / Premises

Purpose: represent a business, body corporate, school, service provider, premises, or organisation linked to recurring safety context.

Fields:

- organisation/business name
- type
- address
- contact person if allowed
- sector
- associated incidents
- recurring risks
- notes

Current support:

- `IntelligenceEntity.entityType = ORGANISATION`
- `Organisation` master records exist with name/code/isActive
- IntelligenceEntity description/address/suburb/sector can hold basic context

Current gaps:

- no link between Organisation register and IntelligenceEntity
- no organisation type on IntelligenceEntity
- no contact person permissions model
- no recurring risk structured fields

### E. Incident Pattern

Purpose: represent a reviewed analytical pattern, not a single incident.

Fields:

- pattern name
- incident codes/subcodes
- cluster
- suburb/sector
- time-of-day band
- date range
- count
- trend direction: increasing, decreasing, stable
- linked source records
- notes

Current support:

- `IntelligenceEntity.entityType = INCIDENT_PATTERN`
- description can hold narrative
- incident/patrol event/entity links
- ReportsSection already calculates monthly trend rows, code/subcode grouping, top locations, and code/suburb matrix

Current gaps:

- no structured pattern fields
- no date range/count/trend direction fields
- reporting clusters are draft/overlay only
- no stored suggestion state

### F. Infrastructure Risk Location

Purpose: represent repeated infrastructure problems that create safety risk.

Fields:

- infrastructure type
- location
- risk level
- repeat count
- municipal reference number
- reported date
- unresolved/resolved
- linked incidents if related

Current support:

- PatrolEvent has infrastructure type, description, location fields, coordinates
- InfrastructureType has risk level
- `IntelligenceEntity.entityType = RISK_LOCATION`
- links to source patrol events

Current gaps:

- no municipal reference field except generic reference number on PatrolEvent
- no repeat count on entity
- no resolved/unresolved field specific to infrastructure risk
- no direct structured relationship between infrastructure fault and related incident, beyond analyst links

## 4. Standard Source Intake Fields

The following “Intelligence-relevant details” block should be reused conceptually across Patrol, Control Room, Reports, and Intelligence. Not every screen needs every field. Mobile Patrol should remain lightweight.

### A. Source details

- source type: patrol, control room, admin, report, external
- source record ID
- source reliability: unknown, low, medium, high, official
- information status: unverified, verified, disputed, false, resolved
- received date/time
- received by
- original reporter if allowed

### B. Classification

- SAPS incident code
- incident subcode
- reporting cluster
- service type
- infrastructure type
- severity/risk level

### C. Location

- street number
- street name
- suburb
- sector
- landmark/location notes
- latitude
- longitude
- place name
- premises type

### D. Person details

- name/alias
- description
- clothing
- behaviour
- direction of movement
- associates
- notes

### E. Vehicle details

- registration
- partial registration
- make
- model
- colour
- type
- distinguishing marks
- direction of travel
- occupants
- notes

### F. Event details

- date/time
- time-of-day band
- description
- reference number
- action taken
- patrol involved
- control room operator
- external service contacted

## 5. Field Standardisation Recommendations

| Field | Entity | Source Screen | Existing Model Field | Required? | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| sourceType | Source | Patrol, Control Room, Reports, External intake | Incident.source partly | Optional now, important later | Intelligence, Reports | Needs standard values beyond Incident.source. |
| sourceRecordId | Source | Promotion panel | Incident.id, PatrolEvent.id | Required for promoted records | Intelligence | Already available through link tables. |
| sourceReliability | Source | Control Room, External intake, Intelligence | Missing | Optional now, later recommended | Intelligence, Reports | Needed for tips and external reports. Privacy risk low. |
| informationStatus | Source/Entity | Intelligence | Missing | Optional now, later recommended | Intelligence, Reports | Values should include UNVERIFIED, VERIFIED, DISPUTED, FALSE_REPORT. |
| confidenceLevel | Entity/Link | Intelligence, promotion | Missing, IntelligenceLink.strength partly | Optional now, later recommended | Intelligence | Strength exists for entity links but not source links/entities. |
| incidentCodeId | Incident Pattern | Patrol Incident Response, Incident, Reports | Incident.incidentCodeId, PatrolEvent.incidentCodeId | Required for incident response where applicable | Reports, Intelligence, Control Room | Already available. |
| incidentSubcodeId | Incident Pattern | Patrol Incident Response, Incident, Reports | Incident.incidentSubcodeId, PatrolEvent.incidentSubcodeId | Optional | Reports, Intelligence | Already available. |
| reportingCluster | Incident Pattern | Reports | Draft mapping only | Optional later | Reports, Intelligence | Use overlay first, do not replace SAPS code. |
| serviceTypeId | Assistance | Patrol Emergency Assistance | PatrolEvent.serviceTypeId | Optional but recommended | Control Room, Reports, Intelligence | Already available. |
| infrastructureTypeId | Infrastructure Risk Location | Patrol Infrastructure Report | PatrolEvent.infrastructureTypeId | Required for infrastructure report | Reports, Intelligence | Already available. |
| severity | Incident/Pattern | Incident Create, Reports | Incident.severity | Required on Incident | Reports, Intelligence | Already available. |
| riskLevel | Intelligence Entity | Intelligence, Promotion | IntelligenceEntity.riskLevel, InfrastructureType.riskLevel | Required on intelligence entity | Intelligence | Existing field. |
| streetNumber | Location | Patrol event | PatrolEvent.streetNumber | Optional | Reports, Intelligence, Map | Existing on PatrolEvent, missing on Incident/IntelligenceEntity. |
| streetName | Location | Patrol event | PatrolEvent.streetName | Required with location notes alternative | Reports, Intelligence, Map | Existing on PatrolEvent. |
| street | Location | Incident | Incident.street | Optional/required by UI | Reports, Intelligence | Less structured than PatrolEvent. |
| suburb | Location | Patrol, Incident, Intelligence | PatrolEvent.suburb, Incident.suburb, IntelligenceEntity.suburb | Optional but important | Reports, Intelligence, Control Room | Existing. |
| sector | Location/Operations | Patrol, Incident, Intelligence | PatrolSession.sector, Incident.sector, IntelligenceEntity.sector | Required operationally | Reports, Intelligence, Control Room | Existing. |
| locationNotes | Location | Patrol event | PatrolEvent.locationNotes | Optional | Intelligence, Control Room | Existing on PatrolEvent. |
| latitude | Location | Patrol event, Intelligence | PatrolEvent.latitude, IntelligenceEntity.latitude | Optional | Intelligence, Map | Existing. |
| longitude | Location | Patrol event, Intelligence | PatrolEvent.longitude, IntelligenceEntity.longitude | Optional | Intelligence, Map | Existing. |
| placeName | Location/Premises | Control Room, Intelligence | Missing | Optional later | Intelligence, Reports | Could fit displayName for now. |
| premisesType | Location/Premises | Intelligence, future Patrol/Control Room | Missing | Optional later | Intelligence, Reports | Useful for hotspot classification. |
| personAlias | POI | Intelligence, future source intake | Missing | Optional later | Intelligence | Keep out of Patrol until policy agreed. |
| personDescription | POI | Patrol observation, Intelligence | PatrolEvent.description, IntelligenceEntity.description | Optional | Intelligence | Free text now. Structured later. |
| clothing | POI | Patrol observation, Control Room | Missing | Optional later | Intelligence | Sensitive and policy-dependent. |
| behaviour | POI | Patrol observation | PatrolEvent.description | Optional | Intelligence | Free text now. |
| directionOfMovement | POI/VOI | Patrol observation | Missing | Optional later | Intelligence | Useful for live context and patterns. |
| registrationNumber | VOI | Intelligence | VOIVehicleDetails.registrationNumber | Required for full VOI if known | Intelligence | Existing. |
| partialRegistration | VOI | Patrol observation, Intelligence | Missing | Optional later | Intelligence | Important because field reports often have partial plates. |
| make | VOI | Intelligence | VOIVehicleDetails.make | Optional | Intelligence | Existing. |
| model | VOI | Intelligence | VOIVehicleDetails.model | Optional | Intelligence | Existing. |
| colour | VOI | Intelligence | VOIVehicleDetails.colour | Optional | Intelligence | Existing. |
| vehicleType | VOI | Intelligence | VOIVehicleDetails.vehicleType | Optional | Intelligence | Existing. |
| distinguishingMarks | VOI/POI | Intelligence | VOIVehicleDetails.distinguishingMarks | Optional | Intelligence | Vehicle only currently. |
| occupantsCount | VOI | Patrol observation, Intelligence | Missing | Optional later | Intelligence | Useful for repeated suspicious vehicles. |
| referenceNumber | Event | Patrol event, assistance, incident service | PatrolEvent.referenceNumber, IncidentServiceLog.refNumber | Optional | Reports, Intelligence, Control Room | Existing in patrol/service contexts. |
| actionTaken | Event | Patrol, Control Room | PatrolEvent.type/status, IncidentServiceLog.status | Optional | Reports, Intelligence | Mostly available through event type/status. |
| externalServiceContacted | Event | Control Room | IncidentServiceLog.serviceId | Optional | Control Room, Reports, Intelligence | Existing for incident service logs, not assistance events. |
| municipalReference | Infrastructure | Patrol/Control Room | PatrolEvent.referenceNumber | Optional | Reports, Intelligence | Can use referenceNumber now. |
| repeatCount | Pattern/Risk Location | Reports, Intelligence | Derived only | Optional | Reports, Intelligence | Do not store until pattern model agreed. |
| trendDirection | Pattern | Reports | Derived only | Optional | Reports, Intelligence | Derived in monthly reports. |

## 6. Existing Schema Gap Analysis

### Fields already supported

- operational patrol session context
- driver/user, crew, patrol call sign, sector
- registered patrol vehicle
- start/end time, KM, status
- PatrolEvent type, description, assistance, sceneActive
- PatrolEvent incident code/subcode
- PatrolEvent service type/infrastructure type
- PatrolEvent reference number
- PatrolEvent structured location and coordinates
- Incident code/title/description/sector/status/severity/source
- Incident linked patrol
- Incident reported/occurred timestamps
- Incident street/suburb
- IncidentCode and IncidentSubcode registers
- ServiceType and InfrastructureType registers
- IntelligenceEntity generic fields
- VOIVehicleDetails basic vehicle fields
- IncidentVOILink and PatrolEventVOILink source links
- IntelligenceLink relationship and strength

### Fields currently free-text only

- POI description
- clothing
- behaviour
- direction of movement/travel
- partial vehicle registration
- occupants
- external report details
- Control Room handling notes for assistance
- escalation/resolution notes outside IncidentServiceLog
- premises type
- pattern narrative
- reason why an entity was promoted, except link notes

### Fields missing but important

- source reliability
- verification status
- confidence level on entity/source link
- external source type
- original reporter controls
- POI structured details
- partial vehicle registration
- VOI direction of travel and occupants
- premises type
- place name separate from displayName/address
- trend direction/count/date range for stored incident patterns
- link to existing entity during promotion

### Fields that can wait

- dedicated POI detail model
- dedicated Location/Premises detail model
- stored incident pattern model
- stored intelligence suggestion model
- media/attachment evidence model
- continuous live GPS tracking
- structured extraction from WhatsApp/free text

### Fields that should not be added yet

- resident/member private fields inside Intelligence by default
- automatic suspect classification fields
- automatic watchlist flags from reports
- hard-delete controls for intelligence sources
- broad external tip database without access/privacy policy

## 7. Promote to Intelligence Improvements

The current `PromoteToIntelligencePanel` is a good first manual promotion flow. It shows read-only source context and lets analysts select entity type, display name, risk level, status, notes, role in incident, or observation type.

Recommended improvements:

### Promote as POI

- show person-specific draft fields when entity type is PERSON
- name/alias
- description
- clothing
- behaviour
- direction of movement
- associates
- confidence and verification draft values
- privacy warning

Until schema changes exist, compile these into description/notes in a consistent format.

### Promote as VOI

- show vehicle-specific fields when entity type is VEHICLE
- registration or partial registration
- make/model/colour/type
- distinguishing marks
- damage/stickers
- occupants
- direction of travel
- last seen location/time from source record

Existing schema supports full registration, make/model/colour/type/marks/notes. Partial registration and movement details should remain notes until reviewed.

### Promote as Location of Interest

- copy street/suburb/sector/location notes/coordinates from source
- allow place name and premises type draft fields
- choose LOCATION or RISK_LOCATION
- allow analyst to mark repeat hotspot or single location observation

Existing schema supports displayName/address/suburb/sector/coordinates.

### Promote as Incident Pattern

- show source incident code/subcode
- allow pattern name
- allow date range/count/trend direction draft fields when promoted from Reports
- link relevant source records where possible

Currently manual pattern creation can use INCIDENT_PATTERN entity type and description.

### Promote as Infrastructure Risk Location

- copy infrastructure type/risk/location/reference
- use RISK_LOCATION entity type
- include unresolved/resolved state in notes
- link source infrastructure patrol event

### Source record preview

Keep the current read-only source preview. Add a clearer “source reliability” and “information status” section later.

### Copy selected source fields into entity

Recommended default mapping:

- source location to entity address/suburb/sector/latitude/longitude
- source description to entity description
- source incident code/type to pattern display name
- source vehicle details to VOI fields
- source infrastructure type to RISK_LOCATION display name

### Analyst confirmation

Keep manual confirmation. Add a required analyst note for high-risk POI/VOI promotions later.

### Verification status and confidence level

Add UI-only draft fields first:

- confidence level
- verification status
- source reliability

Until schema support exists, append these to link notes or entity description in a consistent block.

### Link to existing entity

Important next improvement:

- allow “Create new entity” or “Link to existing entity”
- search existing entities
- if existing selected, create IncidentVOILink or PatrolEventVOILink without creating duplicate entity
- show duplicate warning for same source record

Current backend prevents duplicate source promotion, but it returns the first existing link. It does not yet support linking the same source to an analyst-selected existing entity through the promotion panel.

## 8. Link Types

| Relationship | From entity type | To entity type | Example | Confidence level | When to use |
| --- | --- | --- | --- | --- | --- |
| observed_at | POI/VOI | Location | Person observed at 1 Broadway | LOW to CONFIRMED | Direct field observation with location. |
| linked_to | Any | Any | Vehicle linked to POI | LOW to HIGH | Generic relationship when no better type exists. |
| associated_with | POI | POI/Organisation | Person associated with group/business | LOW to HIGH | Known or reported association. |
| seen_with | POI | POI/VOI | Person seen with another person/vehicle | LOW to HIGH | Observation source only; avoid implying guilt. |
| vehicle_seen_at | VOI | Location | White sedan seen at Valhalla hotspot | LOW to CONFIRMED | Vehicle-location relationship. |
| person_seen_at | POI | Location | Unknown male seen at premises | LOW to CONFIRMED | Person-location relationship. |
| involved_in | POI/VOI/Location | Incident Pattern/Incident source | Vehicle involved in repeated alarms | MEDIUM to CONFIRMED | Use only when source supports involvement. |
| reported_at | External source/POI/VOI | Location | Anonymous tip reported at street corner | LOW to MEDIUM | For reports not directly observed. |
| repeats_at | Incident Pattern | Location | 037 repeats in Valhalla | MEDIUM to HIGH | Derived from monthly trends. |
| connected_to_incident | Any | Incident source | Entity connected to incident INC-123 | MEDIUM to CONFIRMED | Source incident link. |
| connected_to_patrol_event | Any | Patrol event source | Entity connected to patrol observation | MEDIUM to CONFIRMED | Source patrol event link. |
| possible_match | Any | Any | Partial plate may match known VOI | LOW | Analyst has possible but unconfirmed match. |
| confirmed_match | Any | Any | Plate confirmed by CCTV/SAPS | CONFIRMED | Strong verification exists. |

Relationship names should be stored consistently, preferably uppercase internally and displayed in readable labels.

## 9. Confidence and Verification Model

### Confidence values

- LOW: weak, incomplete, anonymous, partial, or single unverified source.
- MEDIUM: plausible and specific, but not independently confirmed.
- HIGH: direct observation, multiple consistent sources, or strong supporting evidence.
- CONFIRMED: official confirmation, reviewed CCTV, SAPS confirmation, or analyst-approved verified match.

### Verification values

- UNVERIFIED: not checked yet.
- PARTIALLY_VERIFIED: some details confirmed, but key claims remain open.
- VERIFIED: confirmed by approved source or direct evidence.
- DISPUTED: credible conflicting information exists.
- FALSE_REPORT: determined false or materially incorrect.
- ARCHIVED: no longer active but retained for audit/history.

### How this should appear

In Intelligence:

- show confidence and verification badges on entity profile
- show source reliability on source links
- filter by risk, confidence, verification, and status
- make unverified external tips visually distinct

In Reports:

- monthly public/community feedback should not expose sensitive POI details
- internal reports may count verified/unverified pattern suggestions separately
- unverified intelligence should not be presented as fact

## 10. Privacy and Access Rules

Guardrails:

- Do not expose private resident/member information unnecessarily.
- Only approved roles can access Intelligence.
- Sensitive POI data must be role-limited.
- External tips must be marked unverified until checked.
- Source records must remain auditable.
- Do not allow casual deletion of intelligence links.
- Archive/clear rather than delete where possible.
- Registered patrol vehicles must not automatically become VOIs.
- Member/patroller data should be source accountability context, not POI data.
- POI contact details should only be stored if lawful, approved, and operationally necessary.
- Community reports should not expose reporter identity broadly.
- Intelligence exports, if added later, need explicit role and sensitivity controls.

## 11. Reporting and Intelligence Connection

Monthly reports should feed Intelligence by suggesting reviewed patterns:

- repeat incident code by suburb
- repeat incident code by time-of-day
- repeat location
- repeat VOI
- repeat assistance requests
- repeat infrastructure faults
- patroller activity context

Monthly Community Safety Trends should use:

- incident code
- incident subcode
- reporting cluster
- suburb
- sector
- street/location
- time-of-day
- trend direction

Recommended handling:

- Reports calculate and display the trend.
- Analyst decides whether a trend becomes an Incident Pattern or Risk Location.
- Intelligence links the pattern back to source incidents/patrol events where possible.
- Public-facing monthly feedback should aggregate safely and avoid exposing POI/private details.

## 12. Recommended UI Flow

### A. From Patrol Event

Flow:

1. View event.
2. Promote to Intelligence.
3. Choose entity type: POI, VOI, Location, Incident Pattern, Risk Location.
4. Confirm source details.
5. Add confidence, verification, notes.
6. Create or link entity.
7. Source PatrolEventVOILink remains the audit connection.

### B. From Incident

Flow:

1. View incident.
2. Promote to Intelligence.
3. Choose POI/VOI/location/pattern.
4. Confirm incident code/subcode, description, severity, location, and date.
5. Add role in incident, confidence, verification, notes.
6. Create or link entity.
7. Source IncidentVOILink remains the audit connection.

### C. From Reports

Flow:

1. Open Monthly Trends.
2. Identify repeat hotspot, increasing code, or repeat location.
3. Click “Create Intelligence Pattern”.
4. Show derived data and supporting records.
5. Analyst confirms pattern, confidence, verification, and notes.
6. Create Incident Pattern or Risk Location entity.

### D. From Intelligence

Flow:

1. Create entity manually.
2. Search/link source incident or patrol event.
3. Add links to person/vehicle/location.
4. Add confidence and verification.
5. Review spider graph and map.
6. Archive/clear when no longer active.

## 13. Recommended First Implementation After This Review

Recommended small safe implementation:

Improve `PromoteToIntelligencePanel` without schema changes.

Scope:

- Add entity-type-specific field sections for PERSON, VEHICLE, LOCATION, INCIDENT_PATTERN, and RISK_LOCATION.
- Add “Create new entity” vs “Link to existing entity” UI.
- Add UI-only confidence, verification, and source reliability fields.
- Store UI-only confidence/verification/reliability in notes/description with a consistent text block until schema is approved.
- Improve source preview to show what fields will be copied into the entity.
- Keep promotion manual and analyst-controlled.

Why this first:

- no Prisma schema change
- uses existing promotion routes and link tables
- improves data quality immediately
- reduces duplicate entities
- keeps Patrol and Control Room workflows stable

Out of scope:

- automatic promotion
- new POI/Location/Pattern schema
- external tips database
- media attachments
- public report exports
- live GPS map

## 14. Open Questions for User / LE

- What POI fields are legally and operationally allowed?
- Who may view POI details?
- Can patrollers record person descriptions?
- Can patrollers record vehicle registration and partial registration?
- Should Control Room record external tips directly?
- What counts as verified?
- Who can mark Intelligence as CONFIRMED?
- How long should unverified intelligence remain active?
- Which monthly trend thresholds create an intelligence suggestion?
- Should anonymous tips be stored at all, or only as Control Room notes?
- Should community reports expose source identity to analysts only, or not at all?
- Should linked entities be archived/cleared by analysts only?
- Should repeat infrastructure faults become Intelligence, Reports-only, or both?
- Should a registered patrol vehicle ever be linked to Intelligence, or only shown as source context?
- What monthly Intelligence outputs may be shared with the community?
