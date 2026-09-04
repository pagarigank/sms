# ADR 006: Bulk Print Failure Handling Policy

## Status
Accepted

## Context
Need to define how to handle failed items in bulk document generation per FR-DOC-3.

## Decision
Auto-retry failed items 3 times with exponential backoff (1s, 5s, 15s).
If still failed after retries, mark job status=manual_retry_required.
Populate bulk_print_job_failures table for manual retry.
Show "Retry Failed" button in UI for registrar to re-run just failed items.

## Consequences
- Balances automation with manual control
- Prevents infinite retry loops
- Provides audit trail of failures
- Allows targeted recovery without regenerating entire batch
