# ADR 009: Active/Default Grading-System Resolution Rule

## Status
Accepted

## Context
Need to define how the system resolves which grading system applies per education level per school year per FR-ACA-7.

## Decision
Per education level per school year:
- The `grading_systems` row with `is_active = true` and `branch_id = NULL` (tenant default) is the default
- A `branch_id IS NOT NULL` row overrides the tenant default for that branch
- Resolution order: (1) branch-specific active, (2) tenant-default active
- If multiple active rows exist for same (tenant, education_level, school_year, branch), service errors

This mirrors the override-by-shadow-row pattern from Phase 1 and architecture.md §4.

## Consequences
- Enables per-branch grading customization
- Supports versioned grading systems by school year
- Clear precedence rules prevent ambiguity
