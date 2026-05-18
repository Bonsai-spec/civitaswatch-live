# Incident Reporting Clusters Draft

Status: Draft for LE/SAPS/manual review before any import  
Source files reviewed:
- `apps/api/prisma/seed-data/saps-incident-codes.json`
- `docs/saps-incident-codes-draft.md`

## Principle

Incident Code and Incident Subcode remain the source of truth.

Reporting Cluster is an analytical overlay used only for reports and dashboards. It must not replace SAPS incident codes in Patrol forms, Control Room, database records, or audit history.

## Time-of-Day Bands

| Band | Time |
|---|---|
| Late Night | 00:00-03:59 |
| Early Morning | 04:00-05:59 |
| Morning | 06:00-11:59 |
| Afternoon | 12:00-15:59 |
| Early Evening | 16:00-18:59 |
| Evening | 19:00-21:59 |
| Night | 22:00-23:59 |

## Day/Night Comparison Bands

| Band | Time |
|---|---|
| Daytime | 06:00-17:59 |
| Night-time | 18:00-05:59 |

## Monthly Community Safety Trends Grouping

Monthly Community Safety Trends should group by:
- Incident Code
- Incident Code Name
- Incident Subcode
- Incident Subcode Name
- Reporting Cluster
- Reporting Subcluster
- Sector
- Suburb
- Street/location
- Time-of-day band
- Month
- Previous month comparison

Do not use broad clusters as a replacement for SAPS code/subcode reporting. Clusters are secondary analytical grouping only.

## Required Monthly Outputs

1. Incidents by Incident Code
2. Incidents by Incident Code + Subcode
3. Incidents by Reporting Cluster
4. Incidents by Suburb
5. Incidents by Sector
6. Incidents by Time-of-Day Band
7. Incident Code by Suburb matrix
8. Reporting Cluster by Suburb matrix
9. Month-to-month increase/decrease per Incident Code
10. Month-to-month increase/decrease per Reporting Cluster
11. Top 10 increasing incident codes
12. Top 10 decreasing incident codes
13. Top repeat locations
14. Night-time vs daytime comparison

## Trend Row Display Example

| Incident Code | Incident Name | Subcode | Subcode Name | This Month | Previous Month | Change | Top Suburb |
|---|---|---|---|---:|---:|---:|---|
| 037 | Burglar Alarm | - | - | 12 | 8 | +50% | Valhalla |
| 038 | Suspicious Person | - | - | 9 | 14 | -35.7% | Clubview |
| 023 | Armed Robbery | - | - | 2 | 1 | +100% | Sector 1 |

## Graph-Ready Datasets

- `incidentsByCode`
- `incidentsByCodeAndSubcode`
- `incidentsBySuburb`
- `incidentsBySector`
- `incidentsByTimeOfDayBand`
- `incidentsByReportingCluster`
- `codeTrendByMonth`
- `clusterTrendByMonth`
- `codeSuburbMatrix`
- `reportingClusterSuburbMatrix`
- `nightTimeVsDaytimeComparison`

## Draft Cluster Mapping

Rows marked `Manual Review` should be confirmed with LE/SAPS before this overlay is used in official reporting.

| Code | Name | Reporting Cluster | Reporting Subcluster | Seriousness | Priority | Monthly | Manual Review | Notes |
|---:|---|---|---|---|---:|---|---|---|
| 001 | Back in Contact | Operational / Administrative SAPS Codes | Radio / Contact Administration | LOW | 1 | No | No | Operational communication code; useful for audit, not community safety trends. |
| 002 | Contact Commander | Operational / Administrative SAPS Codes | Command Contact | LOW | 1 | No | No | Operational communication code; exclude from public monthly incident trend counts. |
| 003 | Location | Operational / Administrative SAPS Codes | Location Update | LOW | 1 | No | No | Location/admin code; avoid counting as a safety incident. |
| 004 | SITRAP | Operational / Administrative SAPS Codes | Situation Report | LOW | 1 | No | No | Situation report/admin code. |
| 005 | Deliver Message | Operational / Administrative SAPS Codes | Message Delivery | LOW | 1 | No | No | Administrative communication task. |
| 006 | Prepare for Lookout | Operational / Administrative SAPS Codes | Lookout Preparation | LOW | 2 | No | Yes | Can support intelligence context, but not an incident trend by itself. |
| 007 | Prepare for Complaint | Operational / Administrative SAPS Codes | Complaint Preparation | LOW | 2 | No | Yes | Preparatory/admin code; confirm use with LE. |
| 008 | Result | Operational / Administrative SAPS Codes | Result / Outcome | LOW | 1 | No | No | Outcome/admin code. |
| 009 | Murder | Serious / Violent Crime | Homicide | CRITICAL | 5 | Yes | No | Critical violent crime; trend separately by code, suburb, sector, and time of day. |
| 010 | Assault GBH | Serious / Violent Crime | Serious Assault | HIGH | 5 | Yes | No | Serious assault trend and hotspot monitoring. |
| 011 | Assault | Serious / Violent Crime | Assault | MEDIUM | 4 | Yes | No | Useful for disturbance and hotspot escalation patterns. |
| 012 | Fighting | Public Order / Community Disturbance | Fighting / Disorder | MEDIUM | 3 | Yes | No | Track by suburb, street, and time of day for public order patterns. |
| 013 | Theft | Property Crime | General Theft | MEDIUM | 4 | Yes | No | Core monthly property-crime trend code. |
| 014 | House Breaking | Property Crime | Burglary / Housebreaking | HIGH | 5 | Yes | No | High-value repeat premises, suburb, and time-of-day trend. |
| 015 | Theft of Vehicle | Vehicle Crime | Vehicle Theft | HIGH | 5 | Yes | No | Core vehicle-crime trend. |
| 016 | Theft out of Vehicle | Vehicle Crime | Theft From Vehicle | MEDIUM | 4 | Yes | No | Useful for hotspot parking areas and time-of-day trends. |
| 017 | Malicious damage | Property Crime | Malicious Damage / Vandalism | MEDIUM | 3 | Yes | No | Track for repeat streets, public assets, and premises. |
| 018 | Use Vehicle No Consent | Vehicle Crime | Unauthorised Vehicle Use | MEDIUM | 3 | Yes | Yes | Vehicle-related offence; confirm local reporting treatment. |
| 019 | Shooting | Serious / Violent Crime | Firearm Violence | CRITICAL | 5 | Yes | No | Critical violent incident and time-of-day trend. |
| 020 | Hostage Situation | Serious / Violent Crime | Hostage / Armed Threat | CRITICAL | 5 | Yes | No | Critical event; likely rare but must surface prominently. |
| 021 | Rape | Serious / Violent Crime | Sexual Offence | CRITICAL | 5 | Yes | Yes | Sensitive critical crime; public reporting may need aggregation/privacy controls. |
| 023 | Armed Robbery | Serious / Violent Crime | Armed Robbery | CRITICAL | 5 | Yes | No | Priority violent-crime trend. |
| 024 | Robbery | Serious / Violent Crime | Robbery | HIGH | 5 | Yes | No | Priority robbery trend. |
| 027 | Child Abuse | Serious / Violent Crime | Child Protection | CRITICAL | 5 | Yes | Yes | Sensitive critical code; public reporting should use careful aggregation. |
| 028 | Trespassing | Suspicious Activity / Prevention | Trespassing / Premises Intrusion | MEDIUM | 4 | Yes | No | Useful early-warning and repeat premises trend. |
| 029 | Disturbing the Peace | Public Order / Community Disturbance | Noise / Peace Disturbance | LOW | 3 | Yes | No | Useful for community disturbance trend by time of day. |
| 030 | Stone Throwing | Public Order / Community Disturbance | Stone Throwing / Public Disorder | MEDIUM | 4 | Yes | No | Track hotspots and escalation risk. |
| 031 | Bomb Exploding | Emergency / Life Safety | Explosion / Bomb Incident | CRITICAL | 5 | Yes | No | Critical life-safety incident. |
| 032 | Bomb Threat | Emergency / Life Safety | Bomb Threat | HIGH | 5 | Yes | No | High-priority threat trend. |
| 033 | Intimidation | Serious / Violent Crime | Threat / Intimidation | HIGH | 4 | Yes | Yes | May overlap with public order; confirm with LE. |
| 034 | Fraud | Property Crime | Fraud / Deception | MEDIUM | 3 | Yes | Yes | Include if community reports are captured locally. |
| 035 | Fire | Emergency / Life Safety | Fire | CRITICAL | 5 | Yes | No | Life safety and service coordination trend. |
| 036 | Arson | Property Crime | Arson | CRITICAL | 5 | Yes | No | Property crime with life-safety risk. |
| 037 | Burglar Alarm | Property Crime | Alarm / Premises Security | MEDIUM | 3 | Yes | Yes | Useful for repeat premises and suburb trend monitoring. |
| 038 | Suspicious Person | Suspicious Activity / Prevention | Suspicious Person | MEDIUM | 4 | Yes | No | Important prevention signal by street, suburb, and time band. |
| 039 | Suspicious Vehicle | Suspicious Activity / Prevention | Suspicious Vehicle | MEDIUM | 4 | Yes | No | Important vehicle-related prevention and intelligence signal. |
| 040 | Suspicious Parcel | Suspicious Activity / Prevention | Suspicious Object / Parcel | HIGH | 4 | Yes | Yes | May require emergency/life safety handling depending on context. |
| 053 | Stock Theft | Drugs / Stock / Special Crime | Stock Theft | HIGH | 4 | Yes | Yes | Relevant for rural/perimeter sectors; confirm local applicability. |
| 054 | Possess / Deal in Drugs | Drugs / Stock / Special Crime | Drug Possession / Dealing | HIGH | 4 | Yes | No | Important repeat-location and intelligence trend. |
| 055 | Suicide | Emergency / Life Safety | Suicide / Self Harm | CRITICAL | 5 | Yes | Yes | Sensitive life-safety trend; public reporting should be aggregated carefully. |
| 059 | SAPS in Danger - Need Help | Emergency / Life Safety | Officer / SAPS Distress | CRITICAL | 5 | Yes | No | Critical assistance/safety event. |
| 067 | Panic Alarm | Emergency / Life Safety | Panic Alarm | HIGH | 4 | Yes | No | Useful for repeat premises, time-of-day, and response trends. |
| 076 | Patrols Required | Suspicious Activity / Prevention | Patrol Request / Prevention | LOW | 2 | Yes | Yes | Prevention demand indicator rather than confirmed incident. |
| 079 | Sudden Death | Emergency / Life Safety | Death / Medical Emergency | CRITICAL | 5 | Yes | Yes | Sensitive life-safety event; public reporting may need aggregation. |
| 080 | Drowning | Emergency / Life Safety | Drowning / Water Emergency | CRITICAL | 5 | Yes | No | Critical emergency trend if locally relevant. |
| 092 | Domestic Violence | Serious / Violent Crime | Domestic Violence | HIGH | 5 | Yes | Yes | Sensitive violent-crime code; public reporting should be aggregated carefully. |
| 095 | Collision Serious | Traffic / Collision | Serious Collision | HIGH | 4 | Yes | No | Traffic safety trend by location and time band. |
| 096 | Collision Damage | Traffic / Collision | Damage Collision | MEDIUM | 3 | Yes | No | Traffic hotspot indicator. |
| 097 | Collision Fatal | Traffic / Collision | Fatal Collision | CRITICAL | 5 | Yes | No | Critical traffic safety trend. |
| 100 | Car Jacking | Vehicle Crime | Carjacking | CRITICAL | 5 | Yes | No | Priority vehicle and violent-crime trend. |
| 101 | Hi-Jacking of Truck | Vehicle Crime | Truck Hijacking | CRITICAL | 5 | Yes | No | Priority vehicle and logistics crime trend. |
| 102 | Business Robbery | Serious / Violent Crime | Business Robbery | CRITICAL | 5 | Yes | No | Priority robbery trend by business area and time band. |
| 103 | House Robbery | Serious / Violent Crime | House Robbery | CRITICAL | 5 | Yes | No | Priority residential robbery trend. |
| 104 | Bank Robbery | Serious / Violent Crime | Bank Robbery | CRITICAL | 5 | Yes | No | Critical robbery trend; likely rare but prominent. |
| 105 | Cash in Transit Robbery | Serious / Violent Crime | Cash-in-Transit Robbery | CRITICAL | 5 | Yes | No | Critical robbery and route-risk trend. |
| 106 | ATM Robbery | Serious / Violent Crime | ATM Robbery | CRITICAL | 5 | Yes | No | Critical robbery trend by facility/location. |
| 107 | Armed Robbery Person | Serious / Violent Crime | Armed Robbery From Person | CRITICAL | 5 | Yes | No | Priority person-focused armed robbery trend. |
| 108 | Armed Robbery from Person | Serious / Violent Crime | Armed Robbery From Person | CRITICAL | 5 | Yes | Yes | Potential overlap with 107; confirm distinction with SAPS/LE. |

## Manual Review Highlights

Confirm these before operational reporting:
- Sensitive public reporting treatment for `021`, `027`, `055`, `079`, and `092`.
- Whether preparatory/admin codes `006` and `007` should ever appear in trend reports.
- Whether `037 - Burglar Alarm` should remain in Property Crime or a separate alarm/prevention cluster.
- Whether `040 - Suspicious Parcel` belongs under Suspicious Activity or Emergency / Life Safety.
- Whether `076 - Patrols Required` should be shown as a prevention demand indicator rather than an incident.
- Distinction between `107 - Armed Robbery Person` and `108 - Armed Robbery from Person`.

## Draft Implementation Notes

- Do not import this overlay into the database yet.
- Future implementation can start as a frontend/server-side mapping lookup by code.
- If this overlay becomes editable later, it should be a separate reporting configuration register, not a replacement for Incident Codes.
- Monthly exports should include both source-of-truth fields and overlay fields:
  - Incident Code
  - Incident Code Name
  - Incident Subcode
  - Incident Subcode Name
  - Reporting Cluster
  - Reporting Subcluster
  - Sector
  - Suburb
  - Street/location
  - Time-of-day band
  - Daytime/Night-time
  - Month
  - This Month
  - Previous Month
  - Change
