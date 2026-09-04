# ADR 005: Ad-Hoc Sales Stock Tracking

## Status
Accepted

## Context
Need to decide whether to track inventory for ad-hoc sales (uniforms, books, IDs) per FR-CSH-9.

## Decision
Ad-hoc sales are pure GL entries with quantity as multiplier only.
No stock tracking in v1 - defer to future cafeteria/inventory module (spec.md §12).

## Consequences
- Simpler initial implementation
- ad_hoc_sale_items.quantity is for GL calculation only
- Future inventory module can add stock tables when needed
- Aligns with "integrate, not rebuild" principle for non-core modules
