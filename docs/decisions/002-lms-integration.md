# ADR 002: LMS Integration Scope

## Status
Accepted

## Context
Spec.md §3 states we should "integrate, not rebuild" an LMS. Need to define scope.

## Decision
Roster sync: system → LMS only (create/update sections + student enrollments in LMS from class_offerings + student_section_assignments).
Triggered on curriculum publish + enrollment confirmation.
No grade passback in v1 - LMS remains read-only for roster data.

## Consequences
- Simpler initial integration
- Clear ownership: SMS is system of record for enrollments
- LMS used for content delivery only
- Grade passback can be added in future phases if needed
