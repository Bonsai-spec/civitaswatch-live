# WhatsApp Demo Operational Data Review

Test period: 2026-05-06 to 2026-05-20

Call signs used: WV61, WW75, WP12, CR01

Source scope: supplied WhatsApp-style and Control Room test examples only.

Import status: all rows have `includeInImport: false` by default.

## Summary Count By Proposed Record Type

| Proposed record type | Count |
| --- | ---: |
| Assistance Request | 7 |
| Incident | 12 |
| Infrastructure | 4 |
| Observation | 7 |
| Total | 30 |

## Rows Needing SAPS Code Review

These rows are marked `needsManualReview: true` because the examples indicate property crime context but do not supply a clear SAPS code/name to prefill.

| Date | Time | Call sign | Proposed type | Location | Reason |
| --- | --- | --- | --- | --- | --- |
| 2026-05-07 | 06:45 | WP12 | Incident | Aswood | Property crime/cable-cutting description needs manual SAPS classification review. |
| 2026-05-08 | 02:10 | WW75 | Incident | Vinstra Foodzone, Valhalla | Positive break-in with reference number 3013809 needs manual SAPS classification review. |
| 2026-05-14 | 07:10 | WP12 | Incident | Residential complex parking, Lyttelton | Vehicle window smashed and items missing needs manual SAPS classification review. |
| 2026-05-16 | 03:40 | WP12 | Incident | Garage premises, Clubview | Attempted break-in with damaged lock needs manual SAPS classification review. |
| 2026-05-19 | 12:15 | WV61 | Incident | Sports field parking, Clubview | Theft from parked vehicle needs manual SAPS classification review. |

## Rows Ready For Import Once Enabled

These rows have enough structure for test-data import review once `includeInImport` is deliberately changed to `true`. They are still internal test data and should not be imported until reviewed.

| Date | Time | Call sign | Proposed type | Classification | Location |
| --- | --- | --- | --- | --- | --- |
| 2026-05-06 | 22:00 | WV61 | Observation | Suspicious Person | Roedolf Ave, Sector 1 |
| 2026-05-06 | 22:30 | WV61 | Assistance Request | Welfare Check | Edinburgh Ave, school side of park, Clubview |
| 2026-05-06 | 23:00 | WV61 | Assistance Request | Safety Concern | Highway after Jean Ave, Sector 2 |
| 2026-05-08 | 19:40 | WV61 | Observation | Suspicious Vehicle | Shopping complex, Valhalla |
| 2026-05-09 | 21:15 | WW75 | Incident | 037 - Burglar Alarm | Broadway, Valhalla |
| 2026-05-10 | 18:25 | WP12 | Infrastructure | Street Light / Lighting | Park entrance, Clubview |
| 2026-05-11 | 20:50 | WV61 | Observation | Suspicious Person | Residential street, Clubview |
| 2026-05-12 | 07:35 | CR01 | Assistance Request | EMS / Medical | Edinburgh Ave, Clubview |
| 2026-05-13 | 20:15 | WW75 | Incident | 037 - Burglar Alarm | Old Johannesburg Road, Clubview |
| 2026-05-14 | 01:20 | WV61 | Incident | 038 - Suspicious Person | Parking area near shopping centre, Valhalla |
| 2026-05-14 | 18:45 | WV61 | Observation | Suspicious Vehicle | Roedolf Ave, Valhalla |
| 2026-05-15 | 09:30 | CR01 | Assistance Request | SAPS | Residential street, Clubview |
| 2026-05-15 | 22:05 | WW75 | Incident | 037 - Burglar Alarm | Warehouse entrance, Valhalla |
| 2026-05-16 | 11:25 | WV61 | Infrastructure | Traffic Light | Main intersection, Valhalla |
| 2026-05-16 | 19:55 | WV61 | Observation | Suspicious Person | Complex entrance, Lyttelton |
| 2026-05-17 | 00:30 | WW75 | Incident | 038 - Suspicious Person | Shopping complex parking, Valhalla |
| 2026-05-17 | 08:50 | CR01 | Assistance Request | EMS / Medical | Shop entrance, Valhalla |
| 2026-05-17 | 16:35 | WP12 | Infrastructure | Road Hazard | School entrance, Clubview |
| 2026-05-18 | 21:10 | WV61 | Incident | 037 - Burglar Alarm | Broadway, Valhalla |
| 2026-05-18 | 23:45 | WW75 | Observation | Suspicious Vehicle | Shopping complex, Valhalla |
| 2026-05-19 | 06:20 | CR01 | Assistance Request | Fire Services | Behind business premises, Lyttelton |
| 2026-05-19 | 18:05 | WP12 | Observation | Suspicious Place | Vacant property, Valhalla |
| 2026-05-20 | 02:25 | WW75 | Incident | 038 - Suspicious Person | Residential gate, Clubview |
| 2026-05-20 | 14:40 | WV61 | Infrastructure | Camera / CCTV | Street camera pole, Valhalla |
| 2026-05-20 | 21:50 | CR01 | Assistance Request | SAPS | Shopping complex, Valhalla |

## Full Review Rows

| Date | Time | Source | Call sign | Proposed type | Observation / classification | Sector | Suburb | Location | SAPS code/name | Manual review | Import |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-05-06 | 22:00 | WhatsApp | WV61 | Observation | Suspicious Person | Sector 1 | | Roedolf Ave | | No | No |
| 2026-05-06 | 22:30 | WhatsApp | WV61 | Assistance Request | Welfare Check | Sector 2 | Clubview | Edinburgh Ave, school side of park | | No | No |
| 2026-05-06 | 23:00 | WhatsApp | WV61 | Assistance Request | Safety Concern | Sector 2 | | Highway after Jean Ave | | No | No |
| 2026-05-07 | 06:45 | WhatsApp | WP12 | Incident | Property Crime | Sector 1 | | Aswood | | Yes | No |
| 2026-05-08 | 02:10 | WhatsApp | WW75 | Incident | Property Crime | Sector 1 | Valhalla | Vinstra Foodzone | | Yes | No |
| 2026-05-08 | 19:40 | WhatsApp | WV61 | Observation | Suspicious Vehicle | Sector 1 | Valhalla | Shopping complex | | No | No |
| 2026-05-09 | 21:15 | WhatsApp | WW75 | Incident | Burglar Alarm | Sector 1 | Valhalla | Broadway | 037 - Burglar Alarm | No | No |
| 2026-05-10 | 18:25 | WhatsApp | WP12 | Infrastructure | Street Light / Lighting | Sector 2 | Clubview | Park entrance | | No | No |
| 2026-05-11 | 20:50 | WhatsApp | WV61 | Observation | Suspicious Person | Sector 2 | Clubview | Residential street | | No | No |
| 2026-05-12 | 07:35 | Control Room Note | CR01 | Assistance Request | EMS / Medical | Sector 2 | Clubview | Edinburgh Ave | | No | No |
| 2026-05-13 | 20:15 | WhatsApp | WW75 | Incident | Burglar Alarm | Sector 2 | Clubview | Old Johannesburg Road | 037 - Burglar Alarm | No | No |
| 2026-05-14 | 01:20 | WhatsApp | WV61 | Incident | Suspicious Person | Sector 1 | Valhalla | Parking area near shopping centre | 038 - Suspicious Person | No | No |
| 2026-05-14 | 07:10 | WhatsApp | WP12 | Incident | Vehicle Crime | Sector 3 | Lyttelton | Residential complex parking | | Yes | No |
| 2026-05-14 | 18:45 | WhatsApp | WV61 | Observation | Suspicious Vehicle | Sector 1 | Valhalla | Roedolf Ave | | No | No |
| 2026-05-15 | 09:30 | Control Room Note | CR01 | Assistance Request | SAPS | Sector 2 | Clubview | Residential street | | No | No |
| 2026-05-15 | 22:05 | WhatsApp | WW75 | Incident | Burglar Alarm | Sector 1 | Valhalla | Warehouse entrance | 037 - Burglar Alarm | No | No |
| 2026-05-16 | 03:40 | WhatsApp | WP12 | Incident | Property Crime | Sector 2 | Clubview | Garage premises | | Yes | No |
| 2026-05-16 | 11:25 | WhatsApp | WV61 | Infrastructure | Traffic Light | Sector 1 | Valhalla | Main intersection | | No | No |
| 2026-05-16 | 19:55 | WhatsApp | WV61 | Observation | Suspicious Person | Sector 3 | Lyttelton | Complex entrance | | No | No |
| 2026-05-17 | 00:30 | WhatsApp | WW75 | Incident | Suspicious Person | Sector 1 | Valhalla | Shopping complex parking | 038 - Suspicious Person | No | No |
| 2026-05-17 | 08:50 | Control Room Note | CR01 | Assistance Request | EMS / Medical | Sector 1 | Valhalla | Shop entrance | | No | No |
| 2026-05-17 | 16:35 | WhatsApp | WP12 | Infrastructure | Road Hazard | Sector 2 | Clubview | School entrance | | No | No |
| 2026-05-18 | 21:10 | WhatsApp | WV61 | Incident | Burglar Alarm | Sector 1 | Valhalla | Broadway | 037 - Burglar Alarm | No | No |
| 2026-05-18 | 23:45 | WhatsApp | WW75 | Observation | Suspicious Vehicle | Sector 1 | Valhalla | Shopping complex | | No | No |
| 2026-05-19 | 06:20 | Control Room Note | CR01 | Assistance Request | Fire Services | Sector 3 | Lyttelton | Behind business premises | | No | No |
| 2026-05-19 | 12:15 | WhatsApp | WV61 | Incident | Vehicle Crime | Sector 2 | Clubview | Sports field parking | | Yes | No |
| 2026-05-19 | 18:05 | WhatsApp | WP12 | Observation | Suspicious Place | Sector 1 | Valhalla | Vacant property | | No | No |
| 2026-05-20 | 02:25 | WhatsApp | WW75 | Incident | Suspicious Person | Sector 2 | Clubview | Residential gate | 038 - Suspicious Person | No | No |
| 2026-05-20 | 14:40 | WhatsApp | WV61 | Infrastructure | Camera / CCTV | Sector 1 | Valhalla | Street camera pole | | No | No |
| 2026-05-20 | 21:50 | Control Room Note | CR01 | Assistance Request | SAPS | Sector 1 | Valhalla | Shopping complex | | No | No |

## Privacy Note

This file is internal `TEST_DATA` only. It is not public reporting, production intelligence, or confirmed intelligence. It does not create POI or VOI records, and it does not include confidential or private source identity.
