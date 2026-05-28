# Pilot Incident Subcodes Review

## Current Problem

Patrol Incident Response reads active Incident Codes and then loads active Incident Subcodes for the selected parent code. The database currently has active numeric SAPS Incident Codes, but most existing active subcodes are linked to inactive demo parent codes such as `ASSAULT`, `BURGLARY`, `FIRE`, `INFRASTRUCTURE`, and `MEDICAL`.

Result: active numeric SAPS codes mostly show no subcodes in Patrol, even though the `IncidentSubcode` table contains active rows.

## Diagnostic Counts

- Active Incident Codes: 60
- Active numeric Incident Codes: 58
- Total Incident Subcodes: 18
- Active Incident Subcodes: 18

## Current Active Usable Subcodes

These active subcodes are linked to currently active parent codes:

| Parent Code | Parent Name | Subcode | Name |
| --- | --- | --- | --- |
| SUSPICIOUS_ACTIVITY | Suspicious Activity | PERSON | Suspicious Person |
| SUSPICIOUS_ACTIVITY | Suspicious Activity | VEHICLE | Suspicious Vehicle |
| THEFT | Theft | FROM_VEHICLE | Theft From Vehicle |
| THEFT | Theft | PETTY_THEFT | Petty Theft |

These are old/demo parent codes, not the active numeric SAPS parent codes used by the current pilot workflow.

## Proposed Pilot Operational Subcodes

These proposed rows are marked as `PILOT_OPERATIONAL_SUBCODES`. They are operational pilot classifications for mobile testing and reporting clarity. They are not official SAPS subcodes unless an official SAPS subcode source is provided and reviewed.

| Parent Code | Parent Name | Subcode | Name |
| --- | --- | --- | --- |
| 037 | Burglar Alarm | ALARM_ACTIVATION | Alarm activation |
| 037 | Burglar Alarm | FALSE_ALARM | False alarm / no visible forced entry |
| 037 | Burglar Alarm | CONFIRMED_BREAK_IN | Confirmed break-in |
| 037 | Burglar Alarm | BUSINESS_PREMISES | Business premises |
| 037 | Burglar Alarm | RESIDENTIAL_PREMISES | Residential premises |
| 038 | Suspicious Person | CHECKING_GATES | Checking gates / properties |
| 038 | Suspicious Person | LOOKING_INTO_YARDS | Looking into yards |
| 038 | Suspicious Person | MOVING_BETWEEN_VEHICLES | Moving between parked vehicles |
| 038 | Suspicious Person | LOITERING | Loitering / suspicious presence |
| 038 | Suspicious Person | LEFT_AREA | Left area before patrol arrival |

## Parent Code Decisions

Confirmed active numeric parent codes:

- `037 - Burglar Alarm`
- `038 - Suspicious Person`

Unresolved decisions:

- Theft / vehicle-related: needs manual SAPS parent code selection. Active numeric candidates found in the register are `013 - Theft`, `015 - Theft of Vehicle`, `016 - Theft out of Vehicle`, `018 - Use Vehicle No Consent`, `039 - Suspicious Vehicle`, and `053 - Stock Theft`.
- Property crime / break-in: needs manual SAPS parent code selection. Active numeric candidates found in the register are `014 - House Breaking` and `037 - Burglar Alarm`.

## Import Safety

The proposed importer must:

- Dry-run by default.
- Apply only with `CONFIRM_PILOT_SUBCODE_IMPORT=YES node apps/api/prisma/scripts/import-pilot-incident-subcodes.js --apply`.
- Resolve parent Incident Codes by active numeric `IncidentCode.code`.
- Create or update by parent `incidentCodeId` plus `subcode`.
- Leave old/demo subcodes linked to inactive parent codes untouched.
