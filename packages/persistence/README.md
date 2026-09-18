# `@fuse/persistence`

DynamoDB repositories for Fuse runs and ordered audit events. This package does **not** publish EventBridge events, call Bedrock, or expose HTTP handlers.

## Tables (C1.4)

- `FuseRuns` — partition key `runId`. Stores the **policy snapshot** on create.
- `FuseEvents` — partition key `runId`, sort key `sequence`. Append-only via `attribute_not_exists(runId)` on the item.

No policy table. `getPolicySnapshot(runId)` reads the snapshot stored on the run.

## Transitions

`CREATED → RUNNING → COMPLETED | FAILED | BREAKER_TRIPPED`

Terminal runs reject `appendEvent` and `updateRunCounters`. Counters update only while `RUNNING`.

## Time and IDs

Callers pass ISO timestamps. The repository does not call `Date.now()`. Run IDs are server-generated (`crypto.randomUUID` or an injected factory).

## Safety

Event `metadata` redacts prompt/secret/`arguments` keys. Conditional writes prevent duplicate run IDs and duplicate `(runId, sequence)` events.
