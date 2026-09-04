# ADR 004: Offline POS OR-Block Size Policy

## Status
Accepted

## Context
Need to define how OR (Official Receipt) number blocks are reserved for offline POS operation per FR-CSH-8.

## Decision
Configurable via cashier_stations.printer_config.or_block_size (JSONB field)
- Default: 50
- Minimum: 10
- Maximum: 500
- Applied per cashier session on open
- Released unused numbers on session close
- Uses ATP series architecture from architecture.md §11.2

## Consequences
- Prevents OR number exhaustion during offline operation
- Allows tuning based on expected offline volume
- Maintains gapless allocation semantics
