# Test Data Cleanup And Report Demo Plan

## Current Incident Data Summary

Diagnostics were run against `civitaswatch_live` on 2026-05-20.

- Total formal Incident records: 40
- Unclassified formal Incident records: 40
- Formal Incident records with SAPS `incidentCodeId`: 0
- Formal Incident records with SAPS `incidentSubcodeId`: 0
- Likely old test Incident candidates by obvious title pattern: 20

The requested diagnostic used a `code` field, but the current Prisma model stores the unique incident reference as `incidentCode`. The diagnostics used `incidentCode` and did not treat it as a SAPS classification.

## Dry-Run Candidate List

Candidate pattern used:

```sql
title ~* '(test|fight|mma|right hook|nnew|ME YOU|MA SL PA|dmv|just happened)'
```

These rows are candidates only. No deletion has been performed.

| ID | Incident Ref | Title | Created At | Linked Patrol | Patrol Events | Intelligence Links | Service Logs |
| --- | --- | --- | --- | --- | ---: | ---: | ---: |
| de7a551c-09d7-4921-a0d6-2a65e8e65070 | INC-20260505-143925-JEKK | fight | 2026-05-05 14:39:25.603 | No | 1 | 0 | 0 |
| 81df32bf-466d-4c0f-9555-80336035d079 | INC-20260504-221900-9Z4L | nnew test | 2026-05-04 22:19:00.047 | Yes | 3 | 0 | 4 |
| a858ac39-5bc4-4295-bbcc-8c973e3c44b2 | INC-20260504-221127-PIPS | right hook | 2026-05-04 22:11:27.274 | Yes | 3 | 0 | 0 |
| ef8d67e5-3b19-47a9-8c14-d58570b17cff | INC-20260504-205143-ICFS | Fighting outside | 2026-05-04 20:51:43.347 | Yes | 6 | 0 | 1 |
| ababa63a-a852-4baa-a174-dc9e639ad23c | INC-20260504-205106-HFWA | mma | 2026-05-04 20:51:06.507 | Yes | 1 | 0 | 1 |
| f46a8a2a-6e7a-44b0-a422-6d66b2446d69 | INC-20260504-204144-P4QV | just happened | 2026-05-04 20:41:44.775 | Yes | 6 | 0 | 0 |
| 5705b316-2182-4b97-aee7-423d23640acc | INC-20260504-192158-UFUC | test today | 2026-05-04 19:21:58.147 | Yes | 5 | 0 | 0 |
| d0c2a77e-f917-471c-bb2f-a79c730edf7b | INC-20260504-140256-0ZV7 | ME YOU | 2026-05-04 14:02:56.151 | Yes | 5 | 0 | 0 |
| 91805fbf-59e2-4ed6-b1e0-3c0c53936744 | INC-20260504-140115-BQBJ | MA SL PA | 2026-05-04 14:01:15.43 | Yes | 6 | 0 | 0 |
| 8a188be1-95c7-4321-bd41-2eb0a3960aa2 | INC-20260504-064332-PY8T | dmv | 2026-05-04 06:43:32.251 | Yes | 2 | 0 | 0 |
| 67b93d25-d547-4f30-8a23-cbbadc7f43ae | INC-20260427-171037-FKC4 | the test | 2026-04-27 17:10:37.135 | Yes | 0 | 0 | 0 |
| b07c70c2-1d13-4428-8e65-0fc6a84a1345 | INC-20260426-183006-Q2Z0 | test 4  56 | 2026-04-26 18:30:06.871 | No | 0 | 0 | 0 |
| 0263b660-25eb-4e57-850b-58e635d91b07 | INC-20260426-100945-TJZ0 | Test Incident | 2026-04-26 10:09:45.938 | No | 0 | 0 | 0 |
| 29fcf5f9-89c2-4a96-964f-a49c6e8439c9 | INC-20260425-120120-SFZT | ETEST1 | 2026-04-25 12:01:20.274 | Yes | 1 | 0 | 0 |
| 21a58c30-134e-40dd-b428-533ef18e7819 | INC-20260425-092934-O8V1 | TEST 1111 | 2026-04-25 09:29:34.22 | Yes | 1 | 0 | 0 |
| 1b9ed000-c760-4c8a-9d96-568817c01349 | INC-20260425-084205-Z7MN | test666 | 2026-04-25 08:42:05.514 | Yes | 1 | 0 | 0 |
| 28015f4a-3f06-4345-8d4f-6c5a5aeda1a5 | INC-20260424-165550-F5GS | TEST2 | 2026-04-24 16:55:50.663 | No | 0 | 0 | 0 |
| 410d4ccb-bd05-419e-8ff6-5df110392c92 | INC-20260424-165213-R0IR | TEST LIVE 1 | 2026-04-24 16:52:13.613 | No | 0 | 0 | 0 |
| 0bdd2759-0088-4718-89c0-9ad4f48bdb59 | INC-20260423-201814-JX0G | TEST333 | 2026-04-23 20:18:14.022 | No | 0 | 0 | 0 |
| 0869bb57-7e6f-41a4-8c09-06e916f6135b | INC-20260423-113923-J56K | Test Incident | 2026-04-23 11:39:23.56 | No | 0 | 1 | 0 |

## What Should Not Be Deleted

- Any record with Intelligence links unless the Intelligence relationship is reviewed and approved for removal.
- Any record with linked patrol events, service logs, or linked patrol sessions unless the operational timeline impact is reviewed.
- Any record that appears to represent a real historical event, even if the title is short or misspelled.
- Any record selected only because it is unclassified. Unclassified does not mean disposable.
- Any old title such as `MVA`, `HOUSE BREAKING`, `Infrastructure: Street Light Out`, or `Suspicious Activity` without manual review. These may be real or useful historical examples and must not be auto-classified or auto-deleted.

## Backup Requirement

Before any destructive data action, run this backup command:

```bash
pg_dump --format=custom --verbose --no-owner --no-acl \
  --file="$HOME/Desktop/civitaswatch-backups/civitaswatch_live_before_test_cleanup_$(date +%Y%m%d_%H%M%S).dump" \
  civitaswatch_live
```

Confirm the dump file exists before deleting or archiving any rows.

## Recommended Cleanup Action

Preferred first action:

- Leave historical Incident records in place.
- Use the report classification resolver behavior already added: old records without SAPS code links remain `Unclassified`.
- Create new realistic Patrol Operations data through the UI so Monthly Safety Trends and Incident Reports have classified data without rewriting history.

Optional later action after review and backup:

- Delete only reviewed local test records that have no Intelligence links, no patrol links, no patrol events, and no service logs.
- Start with the lowest-risk standalone rows such as obvious `TEST` records with zero relationship counts.
- Do not delete records with linked operational data until there is an approved cascade/cleanup plan.

No automatic mapping of old titles to SAPS Incident Codes is recommended in this cleanup batch.

## Realistic Report Test Scenarios Through UI

Create these through Patrol Operations, not direct database inserts, so Patrol, Control Room, Reports, and Intelligence promotion can be tested end-to-end.

### Scenario 1: Burglar Alarm

- Incident Code: `037 - Burglar Alarm`
- Suburb: Valhalla
- Sector: Sector 1
- Location: 1 Broadway
- Time: evening/night if possible
- Expected report result: Incident Reports and Monthly Safety Trends group under `037 - Burglar Alarm`.

### Scenario 2: Suspicious Person

- Incident Code: `038 - Suspicious Person`
- Suburb: Valhalla
- Sector: Sector 1
- Location: shopping complex
- Observation fields: include person description
- Expected report result: classified incident response appears under `038 - Suspicious Person`, with observation detail still free text.

### Scenario 3: House Breaking

- Incident Code: `014 - House Breaking`
- Suburb: Clubview
- Sector: Sector 2
- Location: residential street
- Expected report result: coded incident contributes to Sector 2 and Clubview trend rows.

### Scenario 4: Theft Of Vehicle

- Incident Code: `015 - Theft of Vehicle`
- Suburb: Lyttelton
- Sector: Sector 3
- Vehicle details: capture through Observation if needed
- Expected report result: coded incident groups under `015 - Theft of Vehicle`; vehicle details remain descriptive context, not the classification.

### Scenario 5: Infrastructure Report

- Type: Infrastructure
- Classification: street light or road hazard using the Infrastructure Type dropdown where available
- Location: street/suburb/location notes
- Reference number: add if available
- Expected report result: Infrastructure Reports show the structured infrastructure type and location.

### Scenario 6: Assistance Request

- Type: Assistance request
- Service: SAPS, EMS, or Fire using Service Types where available
- Reference number: add a realistic value
- Location: street/suburb/location notes
- Expected report result: Control Room assistance queue and Reports assistance history show the service type, reference number, and location.

## Manual Verification After UI Data Creation

1. Start or use an active patrol session in Patrol Operations.
2. Capture the coded incident response scenarios above through the mobile patrol workflow.
3. Open Control Room and confirm active patrol timeline and assistance queue update correctly.
4. Open Reports -> Incident Reports and confirm SAPS code/name columns are readable.
5. Open Reports -> Monthly Safety Trends and confirm classifications group by SAPS codes, not `INC-...` references.
6. Export CSV and confirm classification columns are `Incident Code`, `Incident Name`, `Incident Subcode`, and `Incident Subcode Name`.
7. Promote one suitable record to Intelligence and confirm promotion still works.
