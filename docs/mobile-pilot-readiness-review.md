# CivitasWatch Phase 3 Mobile Pilot Readiness Review

Date: 2026-05-26

Scope: controlled mobile phone testing with selected Patrollers, Control Room, Admin, and optional Intelligence users.

This is a review and test checklist only. No schema changes, migrations, database resets, live GPS tracking, or large feature additions are included in this batch.

## Current Readiness Summary

CivitasWatch is ready for a controlled pilot only if the first test is run as a supervised operational rehearsal, not as unsupervised production rollout. The key frontline flows exist: mobile Patrol Operations, Control Room local tabs, Admin registers/reports, and Intelligence Observation Review. The highest pilot risks are mobile form length, field visibility on small phones, network interruption during submissions, and making sure each role sees only the correct workspace.

## Surfaces Reviewed

- Patrol mobile workflow: `apps/web/src/modules/patrols/PatrolOperationsSection.jsx`
- Control Room local tabs: `apps/web/src/main.jsx`
- Admin navigation/register/report coverage: `apps/web/src/navigation/admin.navigation.js`, `apps/web/src/modules/registers`, `apps/web/src/modules/reports`
- Intelligence Observation Review and promotion: `apps/web/src/modules/intelligence`, `apps/web/src/hooks/useIntelligence.js`

## Mobile Patrol Workflow Checklist

| Check | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| Login works on mobile browser with email/password | [ ] | [ ] | [ ] | [ ] | Test on actual patroller phone and mobile network. |
| Patrol Operations route is visible only to intended patroller role | [ ] | [ ] | [ ] | [ ] | Patrollers must not see Intelligence or full Admin registers. |
| Start Patrol form loads on phone portrait | [ ] | [ ] | [ ] | [ ] | Check first screen readability without zoom. |
| Patrol session call sign is manually typed and required | [ ] | [ ] | [ ] | [ ] | Current form requires `Call Sign`. |
| Vehicle selection loads and is usable | [ ] | [ ] | [ ] | [ ] | Confirm default vehicle is not misleading if multiple vehicles exist. |
| Logged-in user remains the driver | [ ] | [ ] | [ ] | [ ] | Crew picker excludes the logged-in user and driver-like member records. |
| Crew selection uses search/add/remove, not a huge checkbox list | [ ] | [ ] | [ ] | [ ] | Confirm with a sector/member list large enough to stress the picker. |
| Selected crew persists into the patrol session | [ ] | [ ] | [ ] | [ ] | Verify in Control Room active patrol and reports. |
| Sector selection works before starting patrol | [ ] | [ ] | [ ] | [ ] | Current default is Sector 1; tester must deliberately change sector. |
| Start KM can be entered on mobile numeric keyboard | [ ] | [ ] | [ ] | [ ] | Confirm keyboard does not hide the submit button. |
| Active patrol status remains after refresh | [ ] | [ ] | [ ] | [ ] | Refresh immediately after starting patrol. |
| Incident Response form opens from active patrol action | [ ] | [ ] | [ ] | [ ] | Must remain a patrol action, not a generic incident form. |
| SAPS Incident Code dropdown loads active codes | [ ] | [ ] | [ ] | [ ] | Confirm useful labels and no free-text classification workaround. |
| SAPS Incident Subcode dropdown filters by selected code | [ ] | [ ] | [ ] | [ ] | Confirm it disables or clears when no code is selected. |
| Optional reference number can be captured | [ ] | [ ] | [ ] | [ ] | Test a real-looking reference and a blank value. |
| Location fields are usable: Street Number, Street Name, Area/Suburb, Landmark/Notes, Latitude, Longitude | [ ] | [ ] | [ ] | [ ] | Street Name or Landmark / Location Notes is required for patrol events. |
| Area/Suburb dropdown writes the selected area and suburb label | [ ] | [ ] | [ ] | [ ] | Confirm Area/Suburb dropdown and raw suburb behavior in reports. |
| Structured Observation form supports General, Suspicious Vehicle, Suspicious Person, Suspicious Place, Community Tip, Infrastructure Concern | [ ] | [ ] | [ ] | [ ] | Confirm no Intelligence-only labels are shown to patrollers. |
| Observation requires at least one useful detail | [ ] | [ ] | [ ] | [ ] | Current validation requires description, tag, reference, or structured detail. |
| Assistance Request captures service type, location, reference, and description | [ ] | [ ] | [ ] | [ ] | Confirm it appears in Control Room assistance queue. |
| Infrastructure Report captures infrastructure type, risk-related register data, location, reference, and description | [ ] | [ ] | [ ] | [ ] | Confirm it appears in Reports and Control Room latest activity. |
| End Patrol form captures End KM and summary | [ ] | [ ] | [ ] | [ ] | Test with valid and blank summary. |
| End Patrol completes active patrol and removes it from active state after refresh | [ ] | [ ] | [ ] | [ ] | Confirm Patrol Reports shows completed patrol. |
| Duplicate submit risk is acceptable | [ ] | [ ] | [ ] | [ ] | Buttons are disabled during `loading`; pilot must still test double taps and slow network. |
| Slow network behavior is understandable | [ ] | [ ] | [ ] | [ ] | Test 3G/poor Wi-Fi; check whether user sees enough feedback. |
| Phone portrait usability is acceptable end to end | [ ] | [ ] | [ ] | [ ] | Test without rotating the phone. |

## Control Room Workflow Checklist

| Check | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| CONTROL_ROOM opens local Control Room workspace, not old route sections | [ ] | [ ] | [ ] | [ ] | Current main render uses `showControlRoomWorkspace` and `renderControlRoomTab()`. |
| Live Overview shows Active Patrols count | [ ] | [ ] | [ ] | [ ] | Confirm after Patroller A starts patrol. |
| Active Patrols tab shows call sign, driver, crew, vehicle, sector, patrol status, last update | [ ] | [ ] | [ ] | [ ] | Must be readable during live operations. |
| Latest Activity shows recent patrol events | [ ] | [ ] | [ ] | [ ] | Confirm event time and summary update after each test event. |
| Incident responses show incident code/subcode reference where available | [ ] | [ ] | [ ] | [ ] | Confirm classification appears in active patrol/latest event or report panels. |
| Observations are visible only as operational summaries | [ ] | [ ] | [ ] | [ ] | Do not expose Intelligence-only POI/VOI labels in Control Room. |
| Assistance Requests tab/queue shows patrol assistance request | [ ] | [ ] | [ ] | [ ] | Confirm service, patrol, vehicle, crew, location, status. |
| Infrastructure events appear in latest activity/report views | [ ] | [ ] | [ ] | [ ] | Confirm type and location. |
| Emergency Services tab is read-only and usable | [ ] | [ ] | [ ] | [ ] | Control Room should coordinate, not administer registers. |
| Incident Codes Reference is read-only | [ ] | [ ] | [ ] | [ ] | Confirm it does not expose full Admin register CRUD. |
| Patrol Reports tab works inside Control Room local tabs | [ ] | [ ] | [ ] | [ ] | Do not reintroduce global Reports route behavior for CONTROL_ROOM. |
| Selected Patrol Timeline tab shows selected patrol events | [ ] | [ ] | [ ] | [ ] | Confirm timeline after selecting a patrol report. |
| No Intelligence tab appears inside Control Room | [ ] | [ ] | [ ] | [ ] | Required role boundary. |

## Admin Workflow Checklist

| Check | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| Areas / Suburbs register is accessible and records load | [ ] | [ ] | [ ] | [ ] | Needed for patrol location dropdown. |
| Incident Codes register is accessible and records load | [ ] | [ ] | [ ] | [ ] | Needed for Patrol Incident Response. |
| Incident Subcodes register is accessible and records load | [ ] | [ ] | [ ] | [ ] | Confirm parent code relationship. |
| Service Types register is accessible and records load | [ ] | [ ] | [ ] | [ ] | Needed for assistance request classification. |
| Infrastructure Types register is accessible and records load | [ ] | [ ] | [ ] | [ ] | Needed for infrastructure reports and observation subtype. |
| Emergency Services register is accessible and records load | [ ] | [ ] | [ ] | [ ] | Needed for Control Room directory. |
| Reports route opens all report tabs | [ ] | [ ] | [ ] | [ ] | Required tabs listed below. |
| Executive Monthly Report PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Confirm after recent PDF export fix. |
| Monthly Safety Trends PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Must not be hidden by filter row overflow. |
| Patroller Activity PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Confirm summary/detail CSV buttons still work. |
| Incident Reports PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Confirm incident classifications are included. |
| Patrol Reports PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Confirm custom Patrol Reports render has shared action bar. |
| Assistance Requests PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Confirm service/status rows. |
| Infrastructure PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Confirm type/risk/location rows. |
| Vehicle Usage PDF export button is visible and downloads PDF | [ ] | [ ] | [ ] | [ ] | Confirm vehicle charts/tables. |
| CSV exports still work where supported | [ ] | [ ] | [ ] | [ ] | Confirm at least Executive, Incident Reports, Patrol Reports. |
| Graph PNG exports still work where available | [ ] | [ ] | [ ] | [ ] | Confirm chart-specific Export Graph buttons. |

## Intelligence Workflow Checklist

| Check | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| Intelligence route is restricted to Intelligence-capable users | [ ] | [ ] | [ ] | [ ] | Patrollers and CONTROL_ROOM must not see it. |
| Observation Review panel loads structured patrol observations | [ ] | [ ] | [ ] | [ ] | Current UI labels this as Intelligence Intake / Observation Review. |
| New patrol observation appears after refresh | [ ] | [ ] | [ ] | [ ] | Use Patroller A test observation. |
| Promote to Intelligence opens manually from Observation Review | [ ] | [ ] | [ ] | [ ] | Analyst-controlled action only. |
| Promotion creates/links Intelligence entity only after user confirmation | [ ] | [ ] | [ ] | [ ] | No automatic POI/VOI creation during patrol capture. |
| Observation source remains linked after promotion | [ ] | [ ] | [ ] | [ ] | Confirm Patrol Observations section on selected Intelligence entity. |
| Confidential notes/POI/VOI fields are not visible to Patroller | [ ] | [ ] | [ ] | [ ] | Required role boundary. |

## Mobile UX Risk List

| Risk | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| Small buttons are hard to tap while in vehicle or outdoors | [ ] | [ ] | [ ] | [ ] | Focus on Patrol action tiles, submit buttons, close/remove crew buttons. |
| Long forms create excessive scrolling | [ ] | [ ] | [ ] | [ ] | Highest risk: Observation and Incident Response. |
| Dropdown usability is poor on older phones | [ ] | [ ] | [ ] | [ ] | Incident code/subcode and Area/Suburb may contain many options. |
| Keyboard covers fields or submit button | [ ] | [ ] | [ ] | [ ] | Test text fields near bottom of forms. |
| Submit button visibility after filling long form | [ ] | [ ] | [ ] | [ ] | Confirm users do not miss final submit. |
| Text wrapping breaks card/action layout | [ ] | [ ] | [ ] | [ ] | Test long service names, incident codes, suburbs, vehicle registrations. |
| Scrolling issues after changing action type | [ ] | [ ] | [ ] | [ ] | User may need to scroll to newly opened form. |
| Slow phone/browser performance | [ ] | [ ] | [ ] | [ ] | Test low-end Android device if possible. |
| Network drops during submit | [ ] | [ ] | [ ] | [ ] | Confirm no confusing success message after failed request. |
| Duplicate submissions from double tap or back/forward navigation | [ ] | [ ] | [ ] | [ ] | Loading disables buttons, but actual phone test is required. |
| Refresh behavior after submit is too slow or unclear | [ ] | [ ] | [ ] | [ ] | Current flow reloads patrol operations after successful submit. |

## Pilot Users

Use a small supervised group:

| User | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| Patroller A | [ ] | [ ] | [ ] | [ ] | Primary full patrol workflow tester. |
| Patroller B | [ ] | [ ] | [ ] | [ ] | Secondary device/browser comparison tester. |
| Control Room user | [ ] | [ ] | [ ] | [ ] | Monitors active patrols and assistance. |
| Admin user | [ ] | [ ] | [ ] | [ ] | Validates registers and reports. |
| Intelligence user, optional | [ ] | [ ] | [ ] | [ ] | Validates Observation Review and manual promotion. |

Pilot setup notes:
- Use test/demo operational data only.
- Assign users to the correct roles before the session.
- Confirm each tester has the correct URL, username/password, device browser, and WhatsApp/email path for sharing screenshots.
- Agree on exact test sector, vehicle, patrol call sign, and fake reference numbers before testing.

## Live Pilot Test Script

### Patroller A

| Step | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| 1. Login on mobile phone | [ ] | [ ] | [ ] | [ ] | Confirm Patrol Operations opens. |
| 2. Start patrol | [ ] | [ ] | [ ] | [ ] | Use typed patrol session call sign, vehicle, sector, crew, start KM. |
| 3. Refresh browser | [ ] | [ ] | [ ] | [ ] | Confirm active patrol remains. |
| 4. Submit Incident Response with SAPS code/subcode | [ ] | [ ] | [ ] | [ ] | Add reference, Area/Suburb, Street Name or Location Notes, description. |
| 5. Submit Observation | [ ] | [ ] | [ ] | [ ] | Use structured observation type and at least one detail. |
| 6. Submit Assistance Request | [ ] | [ ] | [ ] | [ ] | Use service type, location, description. |
| 7. Submit Infrastructure Report | [ ] | [ ] | [ ] | [ ] | Use infrastructure type, location, description. |
| 8. End patrol | [ ] | [ ] | [ ] | [ ] | Enter end KM and summary. |

### Control Room

| Step | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| 1. Confirm active patrol visible | [ ] | [ ] | [ ] | [ ] | Check call sign, driver, crew, vehicle, sector, status. |
| 2. Confirm latest events visible | [ ] | [ ] | [ ] | [ ] | Check incident, observation, assistance, infrastructure sequence. |
| 3. Confirm assistance request visible | [ ] | [ ] | [ ] | [ ] | Check assistance queue/service details. |
| 4. Confirm emergency services visible | [ ] | [ ] | [ ] | [ ] | Read-only directory. |
| 5. Confirm no Intelligence tab is visible | [ ] | [ ] | [ ] | [ ] | Required role boundary. |

### Admin

| Step | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| 1. Confirm reports update after patrol events | [ ] | [ ] | [ ] | [ ] | Check Incident Reports, Patrol Reports, Assistance Requests, Infrastructure. |
| 2. Export Executive Monthly Report PDF | [ ] | [ ] | [ ] | [ ] | Confirm file downloads. |
| 3. Export Incident Reports PDF | [ ] | [ ] | [ ] | [ ] | Confirm current filters are respected. |
| 4. Export CSV | [ ] | [ ] | [ ] | [ ] | Confirm at least one CSV opens correctly. |
| 5. Confirm all report PDF export buttons visible | [ ] | [ ] | [ ] | [ ] | Check every report tab. |

### Intelligence

| Step | Pass | Issue found | Screenshot needed | Fix priority | Notes |
|---|---|---|---|---|---|
| 1. Confirm Patroller A observation appears in Observation Review | [ ] | [ ] | [ ] | [ ] | Refresh Intelligence after patrol event submit. |
| 2. Promote one test observation manually | [ ] | [ ] | [ ] | [ ] | Confirm manual promotion panel, no automatic POI/VOI creation. |
| 3. Confirm linked patrol observation on Intelligence entity | [ ] | [ ] | [ ] | [ ] | Check selected entity detail. |

## Active Report Keys / Tabs To Verify

Actual current report labels are:

- Executive Monthly Report
- Monthly Safety Trends
- Patroller Activity
- Incident Reports
- Patrol Reports
- Assistance Requests
- Infrastructure
- Vehicle Usage

Equivalent pilot keys:

- `executive`
- `monthly-safety-trends`
- `patroller-activity`
- `incident-reports`
- `patrol-reports`
- `assistance-requests`
- `infrastructure`
- `vehicle-usage`

Each must have a visible `Export PDF Report` button and a separate `Print Report` button.

## Pass/Fail Capture Template

Use one row per issue found during the pilot.

| Area | Step | Pass | Issue found | Screenshot needed | Fix priority | Owner | Notes |
|---|---|---|---|---|---|---|---|
| Patrol / Control Room / Admin / Intelligence |  | [ ] | [ ] | [ ] | P0 / P1 / P2 / P3 |  |  |

Priority guide:
- P0: blocks patrol start, emergency/assistance submission, or role security.
- P1: blocks incident/observation/infrastructure submission or Control Room monitoring.
- P2: slows users down but has a clear workaround.
- P3: polish, wording, or layout issue.

## Recommended First Fix Batch

Recommended first small implementation batch after this review: improve mobile submit-state clarity and duplicate-submit protection for Patrol Operations.

Keep the batch narrow:
- Add clearer loading labels on Start Patrol, patrol event submit, status, and End Patrol buttons.
- Keep buttons disabled while requests are in flight.
- Add a short non-invasive "Submitting..." or "Refreshing patrol..." status message near the active form.
- Do not change schema, API contracts, or add live GPS.

Reason: the pilot's highest operational risk is a patroller on a slow phone/network tapping twice or being unsure whether an event submitted. This is smaller and safer than redesigning forms, and it directly protects frontline workflow reliability.
