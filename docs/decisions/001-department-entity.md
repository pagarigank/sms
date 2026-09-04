# ADR 001: Department Entity Design

## Status
Accepted

## Context
We need to clarify the relationship between Department and EducationLevel entities as referenced in spec.md §5 and frontend.md §5 navigation.

## Decision
Department is a per-branch entity that determines which EducationLevels are active at that branch. EducationLevel remains the global taxonomy.

Both entities coexist:
- EducationLevel: Global taxonomy (Kindergarten, Grade 1, ..., Grade 12, Year 1, Year 2, etc.)
- Department: Per-branch activation layer (e.g., "Elementary Department" at Main Campus, "College Department" at Satellite Campus)

The Department table includes:
- `education_level_ids UUID[]` - FK array to education_levels
- `is_default BOOLEAN` - exactly one default per (tenant, branch)
- FK → branches

## Consequences
- Enables per-branch curriculum and fee structure scoping
- Supports the override-by-shadow-row pattern from architecture.md §4
- Aligns with frontend navigation showing "Department (Elementary/JHS/SHS/College)"
