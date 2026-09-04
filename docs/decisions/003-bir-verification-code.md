# ADR 003: BIR Receipt Verification-Code Format

## Status
Accepted

## Context
Need to define the format for verification codes on Official Receipts and generated documents per FR-DOC-2.

## Decision
Format: `SCH-{tenant_short}-{8-char-alphanumeric}-{checksum}`
- tenant_short: first 4 chars of tenant slug, uppercase
- 8-char-alphanumeric: first 8 chars of gen_random_uuid()
- checksum: mod-37 of (tenant_id::text + created_at::text) for basic error detection

Example: `SCH-HAIS-3F7A9B2E-4`

The public GET /verify/:code endpoint (no auth) returns:
{valid: true, document_type, student_name_last_four, issued_at, tenant_name}
or {valid: false} if not valid.

## Consequences
- Provides tamper-evident verification without exposing full PII
- Enables offline verification capability
- Aligns with BIR requirements for receipt authenticity
