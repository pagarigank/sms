# ADR 008: Invoice Generation Triggers

## Status
Accepted

## Context
Need to define when invoices are generated per FR-BIL-5.

## Decision
Invoices are generated (idempotent on enrollment_id + term_id):
1. On enrollment confirmation (auto-assess fees per resolved fee structure)
2. On term start (creates installment schedule)
3. On fee structure change (if new structure would change assessed amount → generates adjustment invoice, not re-issue)

Each trigger uses idempotency-key mechanism to prevent duplicates.

## Consequences
- Ensures invoices are always correct for current fee structure
- Handles mid-term fee changes gracefully via adjustment invoices
- Prevents duplicate invoices through idempotency
- Aligns with append-only money principle (architecture.md §1.5)
