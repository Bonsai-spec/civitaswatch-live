# Incident Classification Backfill Plan

## Current count

- Total formal incident records reviewed: 40
- Formal incident records with SAPS Incident Code links: 0
- Formal incident records with SAPS Incident Subcode links: 0
- Patrol event records with SAPS Incident Code links: 9
- Patrol event records with SAPS Incident Subcode links: 5
- Coded patrol events directly linked to formal incident records: 0

## Example unclassified titles

- MVA
- HOUSE BREAKING
- Fighting outside
- Infrastructure: Street Light Out
- Test Incident
- supicius

## Manual mapping workflow

1. Export or list historical Incident records where `incidentCodeId` is empty.
2. Review each record with its title, description, suburb, address, date, and any operational notes.
3. Assign an existing active SAPS Incident Code only when the reviewer can confirm the correct classification.
4. Assign an Incident Subcode only when the selected code has a matching reviewed subcode.
5. Leave ambiguous records as Unclassified until an Admin can verify them.
6. Keep a record of who performed the backfill and when.

## Warning

Do not automatically map free-text titles to SAPS codes. Short labels such as `MVA`, `FIRE`, `HOUSE BREAKING`, or misspelled titles can be ambiguous without manual review.

## Future admin tool

Add an Admin workflow named "Assign SAPS code to selected historical incident records" that supports:

- Filtering Unclassified incident records.
- Selecting one or more reviewed records.
- Choosing an active Incident Code and optional Subcode from the master registers.
- Saving the selected code IDs to the Incident records.
- Recording reviewer, timestamp, and reason in an audit trail.
