# ADR 007: Notification Template Merge-Field Catalog

## Status
Accepted

## Context
Need to define the canonical set of merge fields available per event type for notification templates per FR-COM-1.

## Decision
Variable syntax: Handlebars-style `{{variable}}`

Catalog per event type:
- absence: {student_name, guardian_name, date, status, section_name}
- low_balance: {student_name, guardian_name, amount_due, due_date, student_number}
- grade_posted: {student_name, guardian_name, subject_name, score, term}
- document_ready: {student_name, document_type, download_url, verification_code}

The notification_templates.body_template TEXT field stores the template with {{variable}} placeholders.
The dispatch service resolves variables from the event payload before sending.

## Consequences
- Consistent templating across all notification channels
- Enables self-service template editing without developer involvement
- Clear contract between backend events and frontend template designers
