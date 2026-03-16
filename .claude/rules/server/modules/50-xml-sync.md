---
description: XML sync pipeline rules for the backend
paths:
  - server/src/modules/xml-sync/**/*
---

# XML sync rules

Apply this rule when working inside the XML sync module.

## Respect the pipeline

Keep the sync flow aligned with the planned MVP pipeline:

1. fetch XML
2. parse XML
3. map raw listings
4. validate listings
5. extract and deduplicate agents
6. build the normalized dataset
7. persist the JSON backup
8. swap the in-memory cache
9. update sync status

Do not reorder these steps without a clear reason and without checking `docs/architecture.md`, `docs/data-model.md`, and `docs/backlog.md` first.

## Full refresh only

Treat sync as a full dataset refresh.

Do not introduce:
- incremental sync logic
- per-record patch updates
- change-stream assumptions
- partial cache mutation strategies

## Cache replacement rule

Do not mutate the live runtime dataset record-by-record during sync.

Build the next dataset first, then replace the current in-memory dataset only after the sync result is valid enough to publish.

## JSON backup rule

The JSON file is a fallback snapshot of the last successful normalized dataset.

Do not treat it as the primary source of truth.
Do not design features that write business changes into it.
Do not use it as a substitute database.

## Invalid record handling

Invalid XML records must not fail the whole sync by default.

Expected behavior:
- skip invalid records
- continue processing valid records
- log why a record was rejected
- track invalid record counts where relevant

## Property acceptance rule

A property may enter the runtime model only if it passes the project acceptance rules.

Important: for this project, a property without a valid XML `id_agent` is invalid and must not enter the runtime dataset.

Some older planning text may still suggest graceful fallback for missing agent mapping. For this project, follow the stricter current decision: a property without a valid `id_agent` does not enter the runtime dataset.

## XML is untrusted input

Treat XML as untrusted external input.

Before a record enters the normalized dataset:
- normalize strings and empty values
- parse numeric fields safely
- normalize repeatable fields into arrays where needed
- reject clearly broken records through validation

Do not expose raw XML structures directly to public API responses.

## Startup and failure behavior

On startup:
- load the latest valid JSON fallback if available
- initialize runtime cache from it when possible
- allow a later XML sync attempt to refresh runtime data

If XML fetch or parse fails:
- keep serving the last valid runtime dataset
- keep the last successful JSON fallback available
- update sync status and logging

## Scope control

Keep the sync module simple and MVP-oriented.

Do not introduce without user approval:
- queue workers
- event buses
- message brokers
- distributed locking systems
- multi-source merge logic
- heavy recovery/orchestration frameworks

If a broader sync design seems useful, propose it explicitly as future work instead of adding it silently.
