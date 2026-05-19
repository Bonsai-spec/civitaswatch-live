# Intelligence Logging and Intake Design

## Purpose

The Intelligence Intake Log should capture analyst-reviewed source information before it becomes confirmed intelligence. It is not visible to patrollers, and it is not a Control Room live queue. Its role is to preserve auditable source record history, review decisions, verification status, sensitivity decisions, and links to any resulting intelligence entities or patterns.

This keeps the platform responsibilities separate:

- Control Room handles live operations.
- Intelligence handles restricted analyst review.
- Admin manages registers and configuration.
- Patrol captures mobile field source records.
- Reports provide history and accountability.

## Intake Sources

Intelligence intake should support these source types:

- Promoted patrol event
- Promoted incident
- Control Room flagged item
- External or community tip
- WhatsApp or radio report
- SAPS reference
- Security company report
- Municipal reference
- Confidential source

Promoted operational records should create or feed a review context. They should not automatically create confirmed POI, VOI, place, pattern, or risk-location records without an analyst decision.

## Suggested Intake Fields

- Intake ID
- Source type
- Source record ID, if linked to an existing incident, patrol event, assistance item, or report
- Received date and time
- Received by
- Source reliability
- Verification status
- Confidential flag
- Visibility level
- Operational summary
- Analyst-only notes
- Linked POI
- Linked VOI
- Linked place or location
- Linked incident pattern
- Linked risk location
- Status: new, under review, linked, archived, false report
- Priority
- Assigned analyst

## Confidential Source Handling

Confidential source identity must be separated from operational visibility:

- Hidden from Patrol.
- Hidden from Control Room unless explicitly authorised.
- Visible only to approved Intelligence roles.
- Excluded from Admin views unless explicitly authorised.
- Used in reports only as anonymised or aggregated information.

Reports should describe verified patterns, risk trends, and operational recommendations without exposing names, phone numbers, handler details, or raw confidential-source notes.

## Relationship With Existing Promotion

Existing promotion functions already support:

- Incident to Intelligence
- Patrol Event to Intelligence

Those flows should become intake/review entry points. A promoted incident or patrol event should preserve the source link, open an analyst review context, and let the analyst decide whether to:

- Link the source to an existing POI, VOI, place, pattern, or risk location.
- Create a new intelligence entity.
- Mark the item as under review.
- Archive it as not intelligence-relevant.
- Mark it as a false report when appropriate.

Promotion should not automatically imply that a person, vehicle, place, or pattern is confirmed.

## Current Capability Without Schema Changes

The current system can safely support:

- Keeping Intelligence as a separate restricted navigation section.
- Showing Intelligence entities, links, spider graph, and geo map to authorised Intelligence users.
- Promoting incidents and patrol events through existing Intelligence routes.
- Linking promoted records to existing intelligence entities through current VOI/source link models.
- Showing a placeholder for an Intelligence Intake / Review Queue without fake data.
- Documenting intake policy, sensitivity rules, and future fields before database changes.

## Future Schema Gap Analysis

These concepts need future schema work before real intake logging is implemented:

- `IntelligenceIntakeLog`: source review record with source link, summary, status, priority, assignment, and audit fields.
- `ConfidentialSource`: restricted source identity, contact/handler metadata, and separation from operational records.
- `VerificationStatus`: controlled values such as unverified, corroborated, verified, disproven, and unable to verify.
- `SourceReliability`: controlled values for source credibility and historical confidence.
- `VisibilityLevel`: controlled values that define who may see source details, summaries, or anonymised outputs.
- `IntelligenceReviewStatus`: controlled workflow states such as new, under review, linked, archived, and false report.

Future implementation should include migrations, API authorization checks, audit logging, and UI controls that prevent Patrol, Control Room, Admin, and Reports from seeing confidential source details outside their authorised scope.
