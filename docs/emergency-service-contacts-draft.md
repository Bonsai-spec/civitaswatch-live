# Emergency Service Contacts Draft

Status: Draft for manual review. Do not import until verified.

Source: Provided emergency service contact list.

## Purpose

This document prepares emergency service and operational contact numbers for CivitasWatch Admin-managed service/contact registers and Control Room read-only Service Directory use.

Admin remains responsible for maintaining master service/contact data. Control Room should consume this information as a read-only operational directory for Assistance Requests, Incidents, and service coordination.

## Current Model Fit

The current `Service` model supports:

| Field needed | Current support |
| --- | --- |
| Name | Supported by `Service.name` |
| Type/category | Supported by `Service.type` enum-style string |
| Primary phone | Supported by `Service.phone` |
| Sector/area served | Supported by `Service.sector` |
| Active status | Supported by `Service.isActive` |
| Secondary phones | Not directly supported |
| WhatsApp number | Not directly supported |
| Notes | Not directly supported |
| Verified status | Not directly supported |
| Last verified date | Not directly supported |

For a later import without schema changes, the first phone number can be imported into `Service.phone`, and the category can be mapped to the existing service type values. Secondary phone numbers, WhatsApp numbers, notes, and verification fields are preserved in the JSON draft for review.

## Service Type Mapping

| Directory category | Existing `Service.type` value |
| --- | --- |
| SAPS | `POLICE` |
| Fire Services | `FIRE` |
| Ambulance / Medical | `AMBULANCE` |
| Metro / Municipality | `METRO` |
| Sector Contacts | `SECURITY_BACKUP` |
| Internal / Community Contacts | `CONTROL_ROOM` |

## Contacts For Review

| Category | Name | Primary phone | Secondary phone(s) | WhatsApp | Sector / area served | Active | Verified | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SAPS | South African Police Service | 10111 |  |  | All sectors | Yes | No | National SAPS emergency number. Draft/unverified. |
| SAPS | SAPS Local | 012 685 0015 |  |  | Local | Yes | No | Draft/unverified local SAPS contact. |
| SAPS | SAPS Customer Service Centre | 071 675 6459 |  |  | Local | Yes | No | Draft/unverified SAPS customer service centre contact. |
| Fire Services | Fire Services | 10177 |  |  | All sectors | Yes | No | Emergency fire services contact. Draft/unverified. |
| Fire Services | Fire Services | 012 358 6400 |  |  | Local / Tshwane | Yes | No | Local fire services contact. Draft/unverified. |
| Fire Services | Central Fire | 082 555 8929 |  |  | Central | Yes | No | Draft/unverified central fire contact. |
| Fire Services | Fire and Rescue | 012 310 6300 | 012 310 6400 |  | Local / Tshwane | Yes | No | Draft/unverified fire and rescue contact. |
| Ambulance / Medical | State Ambulance | 10177 |  |  | All sectors | Yes | No | Emergency ambulance contact. Draft/unverified. |
| Ambulance / Medical | GPG Ambulance | 011 554 0000 | 011 564 2210 |  | Gauteng | Yes | No | Draft/unverified GPG ambulance contact. |
| Ambulance / Medical | ER24 | 084 124 | 082 911; 0861 084 124 |  | All sectors | Yes | No | Draft/unverified ER24 contact. |
| Ambulance / Medical | Netcare 911 | 082 911 |  |  | All sectors | Yes | No | Draft/unverified Netcare 911 contact. |
| Ambulance / Medical | Emer-G-Med | 081 237 9033 |  |  | All sectors | Yes | No | Draft/unverified Emer-G-Med contact. |
| Ambulance / Medical | Emergency Medical Solutions | 073 969 7987 |  |  | All sectors | Yes | No | Draft/unverified emergency medical solutions contact. |
| Ambulance / Medical | Military Ambulance | 012 314 0999 |  |  | Military / local | Yes | No | Draft/unverified military ambulance contact. |
| Ambulance / Medical | Life Med | 086 108 6911 |  |  | All sectors | Yes | No | Draft/unverified Life Med contact. |
| Ambulance / Medical | Community Emergency Response Team / CERT | 087 095 3556 |  |  | Community | Yes | No | Draft/unverified CERT contact. |
| Ambulance / Medical | MonAmi Trauma | 073 653 4497 | 082 559 7264; 072 357 5988 |  | All sectors | Yes | No | Draft/unverified trauma support contact. |
| Metro / Municipality | Metro | 012 664 4445 | 012 358 7096 |  | Metro / local | Yes | No | Draft/unverified metro contact. |
| Metro / Municipality | City of Tshwane | 012 310 6200 |  |  | City of Tshwane | Yes | No | Draft/unverified municipal contact. |
| Sector Contacts | Sector 1 | 079 733 2149 | 079 733 2138 |  | Sector 1 | Yes | No | Draft/unverified sector contact. |
| Sector Contacts | Sector 2 | 076 883 2437 |  |  | Sector 2 | Yes | No | Draft/unverified sector contact. |
| Sector Contacts | Sector 3 | 072 837 5278 |  |  | Sector 3 | Yes | No | Draft/unverified sector contact. |
| Internal / Community Contacts | ADS WhatsApp Group Admins | 061 310 4176 |  | 061 310 4176 | Community | Yes | No | Draft/unverified internal/community contact. |

## Duplicate And Review Notes

- `10177` appears for both Fire Services and State Ambulance. This may be valid as a shared emergency number and should be confirmed before import.
- `082 911` appears as Netcare 911 and as an ER24 secondary number. Confirm whether this should remain on both records.
- Two rows are named `Fire Services` with different numbers. Confirm whether these should remain separate, or whether one should be renamed with a dispatch/area qualifier.
- All rows are marked unverified and should receive manual confirmation before production use.
- Secondary phones, WhatsApp numbers, notes, verification status, and last verified date need either a later schema enhancement or an approved convention before database import.

## Proposed Later Import Behaviour

When approved, a focused import script should:

1. Upsert by `name`, `type`, and `phone` without deleting existing service rows.
2. Keep existing records active unless explicitly disabled by Admin.
3. Import the primary phone into `Service.phone`.
4. Import the mapped category into `Service.type`.
5. Import sector/area into `Service.sector`.
6. Leave secondary phone, WhatsApp, notes, and verification metadata out of the database unless a schema enhancement has been approved.

## Control Room Directory Behaviour

Control Room should continue using the local tab layout and the read-only Service Directory / Emergency Contacts tab. CONTROL_ROOM users must not receive full Admin Registers access. Admin remains the owner of service/contact maintenance.
