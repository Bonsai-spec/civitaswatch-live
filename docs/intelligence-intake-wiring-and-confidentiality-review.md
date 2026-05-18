# CivitasWatch Phase 3 Intelligence Intake Wiring and Confidentiality Review

## Executive Summary

Patrol, Control Room, Admin, Reports, and Intelligence should not all see or edit the same sensitive information. Each module should capture the minimum structured information needed for its job, then pass auditable source records into an Intelligence review flow when appropriate.

Recommended principle:

- Patrol captures source observations, not intelligence conclusions.
- Control Room captures operational handling and source context, not analyst comments.
- Admin manages controlled registers and lookup values, not live intelligence.
- Reports produces aggregated trends and review candidates, not sensitive entity exposure.
- Intelligence reviews, verifies, links, and classifies POI, VOI, places, patterns, and confidential sources.

The current schema already supports patrol events, incidents, assistance, infrastructure, location fields, promotion links, and intelligence entities. It does not yet support source reliability, verification status, confidential source handling, review queues, tags, or structured POI/VOI/place subfields. Those should be designed before schema changes.

## 1. Should Patrol Observation Be Redesigned?

Yes, but carefully. Patrol Observation should be redesigned from a single free-text description into a lightweight structured observation flow that still works quickly on mobile.

Recommended observation types:

- General
- Suspicious Person
- Suspicious Vehicle
- Suspicious Place
- Community Tip
- Infrastructure Concern

The Patrol form should keep free text, but add a small number of guided fields based on type. Patrollers should capture what they observed or were told; they should not classify someone as a confirmed POI/VOI or see existing Intelligence labels.

Recommended behaviour:

- Default to `General`.
- Require either street name or landmark/location notes, as current Patrol events already do.
- Use optional structured fields for person/vehicle/place detail.
- Add a “Flag for Intelligence Review” option only if policy allows patrollers to flag, or infer review candidates later from observation type/tags.
- Store sensitive conclusions for analysts only, not in the patrol-visible workflow.

## 2. Fields by Observation Type

### General

Purpose: capture routine observations that may later support context.

Fields:

- description
- street number
- street name
- suburb
- landmark/location notes
- latitude/longitude
- optional tags
- reference number, if available

Current support:

- PatrolEvent.description
- PatrolEvent.streetNumber/streetName/suburb/locationNotes
- PatrolEvent.latitude/longitude
- PatrolEvent.referenceNumber

### Suspicious Vehicle

Fields:

- registration
- partial registration
- make
- model
- colour
- vehicle type
- occupants
- direction of travel
- distinguishing marks
- linked location
- description/free-text notes
- optional tag: Unverified

Recommended mobile rules:

- Full registration is optional because patrollers may only see a partial plate.
- Partial registration should be explicitly supported later.
- Direction of travel should be a small text/select field.
- Do not show existing VOI matches to Patrol.

Current support:

- free text only through PatrolEvent.description
- linked location through PatrolEvent location fields
- VOI details exist only after Intelligence promotion

### Suspicious Person

Fields:

- alias/name if volunteered
- clothing
- physical description
- behaviour
- direction of movement
- associates
- linked vehicle
- linked location
- description/free-text notes
- optional tag: Unverified

Recommended mobile rules:

- Do not require name.
- Do not encourage patrollers to identify people unless volunteered or officially known.
- Keep wording observational: “person description” rather than “suspect”.
- Do not show POI labels or prior Intelligence links.

Current support:

- free text only through PatrolEvent.description
- linked location through PatrolEvent location fields

### Suspicious Place

Fields:

- place name
- street number
- street name
- suburb
- landmark
- coordinates
- premises type
- reason for concern
- observed activity
- optional tag: Repeat Location or Requires Follow-up

Current support:

- PatrolEvent location fields
- PatrolEvent.description
- IntelligenceEntity LOCATION/RISK_LOCATION after promotion

### Community Tip

Fields:

- source type: community member, WhatsApp, anonymous, CCTV, security company, SAPS, municipal, other
- source note
- public/operational summary
- confidential flag
- original reporter, only if allowed
- information status: unverified by default
- location
- description
- reference number

Recommended mobile rules:

- If Patrol receives a tip, the tip should be marked as unverified by default.
- Confidential source identity should not be visible to general Patrol users after submission.
- Prefer Control Room as the main place for external/community source intake.

Current support:

- description/reference/location can be captured
- no structured source type/reliability/confidential fields yet

### Infrastructure Concern

Fields:

- infrastructure type
- location
- risk level from infrastructure type where available
- description
- municipal/reference number
- unresolved/resolved if known
- photo/media later, if implemented
- optional tags: Requires Follow-up, Possible CCTV, Repeat Location

Current support:

- PatrolEvent.infrastructureTypeId
- PatrolEvent.referenceNumber
- PatrolEvent.description
- PatrolEvent location fields

## 3. Recommended Tags

Tags should be controlled values. Some are useful to Patrol and Control Room; some should be Intelligence-only.

Operational/source tags:

- Suspicious Vehicle
- Suspicious Person
- Suspicious Place
- Community Tip
- Infrastructure Concern
- Possible CCTV
- Requires Follow-up
- Unverified

Intelligence/review tags:

- Repeat Location
- Confidential Source
- Possible Match
- Confirmed Match
- Analyst Review Required
- Pattern Candidate
- High Sensitivity

Recommended visibility:

- Patrol can apply operational/source tags only.
- Control Room can apply operational/source tags and “Requires Follow-up”.
- Intelligence can apply all tags, including confidential/sensitivity tags.
- Reports should only use tags in aggregate unless explicitly authorised.

## 4. What Patrol Should Not See

Patrol should not see:

- POI labels
- VOI labels
- risk level
- previous intelligence links
- confidential notes
- analyst comments
- confidential source identity
- source reliability scoring
- historical allegations against a person or vehicle
- watchlist status

Why:

- Patrol is a field capture workflow, not an intelligence analysis workflow.
- Exposing POI/VOI labels can bias field reports and increase privacy/legal risk.
- Sensitive source details should be limited to authorised Intelligence users.

Patrol may see:

- their active patrol
- their submitted event
- operational incident status
- Control Room instructions where relevant
- neutral source capture fields

## 5. What Control Room Should Capture

Control Room should capture operational handling and external/community source context, but not full analyst-only intelligence notes.

Recommended fields:

- report source type
- caller/source note
- public/operational summary
- confidential flag, if source identity must be protected
- service contacted
- reference number
- action taken
- escalation note
- resolution note
- flag for intelligence review
- received date/time
- received by/control room operator
- linked incident or patrol event
- location
- source reliability, if Control Room is trained/authorised to assess it
- information status: unverified by default for external tips

Current support:

- assistance requests come from PatrolEvent.assistance
- service contacts exist as Admin-managed emergency services
- IncidentServiceLog supports incident service status/ref/notes
- assistance resolution currently sets `sceneActive = false`

Current gap:

- no structured Control Room external tip/intake model
- no handling notes on assistance request beyond source PatrolEvent fields
- no confidential flag/source reliability/visibility level

## 6. What Admin Should Manage

Admin should manage configuration registers, not intelligence casework.

Suitable registers:

- observation types
- vehicle types
- colours
- premises types
- tags
- source types
- confidence levels
- verification statuses

Important caution:

- Do not add all of these as database-backed registers immediately.
- Start with fixed UI constants or draft configuration if the values are still under review.
- Promote to Admin registers only when LE agrees the values are stable.

Existing Admin-aligned registers:

- Incident Codes
- Incident Subcodes
- Service Types
- Infrastructure Types
- Emergency Contact Types
- Emergency Services
- Members/Patrollers/Vehicles/Organisations

Potential future registers:

- Observation Type
- Observation Tag
- Source Type
- Premises Type
- Vehicle Colour
- Vehicle Type
- Confidence Level
- Verification Status

## 7. Confidentiality Model

### Core fields

Recommended confidentiality metadata:

- source type
- source reliability
- confidential flag
- visibility level
- analyst-only notes
- public/operational summary
- anonymised report text
- information status
- received by
- source record ID

### Source type

Suggested values:

- PATROL_DIRECT
- CONTROL_ROOM_CALL
- WHATSAPP_REPORT
- COMMUNITY_MEMBER
- ANONYMOUS_TIP
- CCTV
- SECURITY_COMPANY
- SAPS
- MUNICIPAL
- INTERNAL_ADMIN
- REPORT_ANALYSIS

### Source reliability

Suggested values:

- UNKNOWN
- LOW
- MEDIUM
- HIGH
- OFFICIAL

### Confidential flag

Purpose:

- Marks that source identity or sensitive details must not be shown broadly.
- Does not automatically confirm truth.

### Visibility level

Suggested values:

- OPERATIONAL_SUMMARY
- CONTROL_ROOM
- INTELLIGENCE
- SENIOR_INTELLIGENCE
- ADMIN_CONFIG_ONLY
- REPORTS_AGGREGATED

### Role visibility

Patrol:

- source capture only
- no confidential notes
- no POI/VOI labels
- no prior links

Control Room:

- operational summary only
- handling/escalation/resolution notes
- no analyst-only notes unless explicitly authorised

Admin:

- register/config only
- no intelligence case notes by default

Intelligence Analyst:

- full sensitive source where authorised
- can see confidential flag, reliability, verification, and analyst notes

Reports:

- anonymised/aggregated only
- no confidential source identity
- no sensitive POI detail in community-facing outputs

Master Admin:

- may technically have broad access, but operational policy should still define when sensitive source details may be viewed.

## 8. Intelligence Review Queue

Recommended flow:

Source event flagged
-> appears in Intel Review Queue
-> analyst opens source preview
-> analyst chooses POI, VOI, Place, Pattern, or Infrastructure Risk
-> analyst links existing entity or creates new
-> analyst sets confidence and verification
-> analyst sets visibility/confidentiality
-> source record remains auditable

Queue sources:

- Patrol observation tagged Suspicious Person/Vehicle/Place
- Community Tip
- Control Room flagged external report
- Assistance request marked Requires Follow-up
- Infrastructure concern marked repeat/high-risk
- Reports trend marked Pattern Candidate
- Manual “Promote to Intelligence” from incident/patrol event

Queue item fields:

- source type
- source record ID
- source summary
- source reliability
- information status
- confidential flag
- created/received timestamp
- location
- tags
- assigned analyst
- review status: NEW, REVIEWING, LINKED, DISMISSED, ARCHIVED

No schema change approach:

- Use the current Promote to Intelligence flow.
- Use notes/description conventions for confidence and verification.
- Use Reports as manual pattern discovery.
- Maintain review queue as a design target until schema is approved.

## 9. Schema Gap Analysis

### Current schema supports

- PatrolEvent as source event
- Incident as operational source record
- PatrolSession and PatrolSessionCrew context
- structured PatrolEvent location
- incident code/subcode classification
- service type and infrastructure type classification
- assistance request through PatrolEvent.assistance
- IncidentServiceLog for incident service coordination
- IntelligenceEntity
- VOIVehicleDetails
- IncidentVOILink
- PatrolEventVOILink
- IntelligenceLink with relationship and strength
- role permissions for Patrol, Control Room, Reports, Admin, Intelligence Analyst

### Can be done without schema change

- redesign Patrol Observation UI as a structured form but serialize extra details into PatrolEvent.description
- add observation type as a controlled prefix/tag in description
- add source reliability/confidence/verification as UI-only values written into link notes
- improve PromoteToIntelligencePanel with entity-specific sections
- add “link to existing entity” if backend creates source link to selected entity
- show an Intelligence review workflow using filtered promoted/unpromoted source events if existing data is enough
- keep confidential source identity out of Patrol-visible screens
- improve Reports wording and manual pattern promotion design

### Needs future schema change

- structured observation type field
- tags table or event tags
- source reliability field
- verification status field
- confidence level field
- confidential flag
- visibility level
- analyst-only notes
- public/operational summary
- anonymised report text
- external source intake records
- review queue model
- link-to-existing source promotion endpoint/model support if multiple entity links per source are required
- POI detail model
- Place/Premises detail model
- partial vehicle registration and movement fields

### Should wait

- automatic POI/VOI creation
- automatic watchlist scoring
- automated suspect matching from free text
- broad external tips database
- media/CCTV evidence model
- public intelligence reporting
- live GPS/intelligence map fusion
- schema-backed registers for every proposed value before LE confirms terms

## 10. Recommended First Implementation Batch

Recommended small safe batch:

Document and prototype the Patrol Observation redesign in UI only, without schema changes.

Scope:

- Add observation type selector to Patrol Observation.
- Add type-specific fields in the form.
- Serialize structured details into the existing PatrolEvent.description in a clear, labelled format.
- Keep existing location fields and validation.
- Add optional non-sensitive tags: Suspicious Vehicle, Suspicious Person, Suspicious Place, Possible CCTV, Requires Follow-up, Community Tip, Unverified.
- Do not show POI/VOI labels, risk levels, previous links, or analyst notes to Patrol.
- Do not add confidential source identity fields to Patrol until policy is agreed.

Why this first:

- improves source quality immediately
- avoids schema changes
- preserves Patrol mobile workflow
- keeps Intelligence analyst-controlled
- produces better source records for the existing promotion panel

Out of scope for first batch:

- schema changes
- automatic intelligence promotion
- confidential source database
- analyst-only notes storage
- review queue persistence
- Reports pattern promotion
- Control Room external intake model

## Review Decisions Needed

- Which Patrol observation fields are acceptable operationally and legally?
- Should patrollers be allowed to capture partial vehicle registrations?
- Should patrollers be allowed to capture person clothing/description?
- Should Community Tip live in Patrol, Control Room, or both?
- Who can mark a source confidential?
- Who can view confidential source identity?
- Should Reports users ever see intelligence tags, or only anonymised aggregates?
- Which tags should be operational and which should be Intelligence-only?
- Should Admin registers be created for observation types/tags now, or only after field testing?
