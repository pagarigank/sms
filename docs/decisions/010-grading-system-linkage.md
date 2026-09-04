# ADR 010: Curriculum Subject → Grading System Linkage

## Status
Accepted

## Context
Need to define which grading system applies to which curriculum subject per FR-GRA-1.

## Decision
The `curriculum_subjects.effective_grading_system_id` field (UUID FK → grading_systems) is resolved at curriculum-publish time (when curriculum transitions from status=draft to status=active).

Resolution: Look up active `grading_systems` row for that education_level + school_year (with branch override per ADR 009).
If no branch override exists, use tenant default (branch_id = NULL).
The grade entry's `grading_system_id` (captured at entry time) is authoritative - changing grading system after publish does NOT retroactively affect existing grade entries.

## Consequences
- Grade entries are immutable with respect to grading system used
- Enables historical grading consistency
- Clear audit trail of which grading system applied to each grade entry
