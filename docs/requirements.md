# Fuse requirements (C0.3)

## One-sentence meaning of “blocked before the next call”

When `beforeCall` returns `allowed: false`, Fuse must persist the decision, trip the breaker, publish `BreakerTripped`, and **must not invoke** the Bedrock Converse request or the tool function for that attempted step.

## Product requirements

1. Integrated runner only: invoice-verification agent with allowlisted synthetic tools.
2. Four policies: `maxSteps`, `maxEstimatedCostUsd`, `maxRuntimeMs`, `maxRepeatedActionCount`.
3. Stable action signature: `name` + recursively key-sorted JSON of arguments.
4. DynamoDB run summary + append-only events with conditional sequence writes.
5. EventBridge event on breaker trip.
6. Replay creates a **new** run; terminal original runs are immutable.
7. Public demo: synthetic data, rate/concurrency/step/time limits, Zod on the server.
8. Cost UI always says **Estimated run cost**.

## Scenarios (allowlist)

| Scenario id | Invoice | Expected outcome |
| --- | --- | --- |
| `invoice-verification-loop` | INV-DEMO-001 ambiguous | Repeated `verify_vendor` → breaker trips |
| `invoice-verification-safe` | INV-DEMO-002 verified | Completes `COMPLETED` |
| `invoice-verification-tool-error` | INV-DEMO-003 tool_error | Retries then next attempt blocked |

Synthetic records only. Label **Synthetic demo data**.

## Run state machine

```
CREATED → RUNNING → COMPLETED
                  → FAILED
                  → BREAKER_TRIPPED
```

Invalid transitions must be rejected. Terminal states (`COMPLETED`, `FAILED`, `BREAKER_TRIPPED`) must not accept new calls or mutated event history. Reset is demo-control only and must not interleave a live run’s ledger.

## Policy evaluation order (before each call)

Pure evaluator: `evaluateBeforeCall` in `@fuse/policy-engine`. Caller supplies `elapsedMs`; the engine does not use a clock or AWS.

1. `INVALID_POLICY` if the policy is disabled or has negative / non-finite / non-integer limits.
2. `INVALID_RUN_STATE` if counters, kind, status, or history are invalid.
3. Run status must be `RUNNING` (`RUN_NOT_RUNNING` otherwise).
4. Runtime: `elapsedMs >= maxRuntimeMs` → block.
5. Steps: `stepCount + 1 > maxSteps` → block (current 5 / max 6 allows; current 6 / max 6 blocks).
6. Estimated cost: `current + proposed > maxEstimatedCostUsd` → block (equality allowed).
7. Normalize the next action. If that fails → `UNSUPPORTED_ACTION_ARGUMENTS`.
8. Repeats: matching signatures + this call `> maxRepeatedActionCount` → `MAX_REPEATED_ACTION_EXCEEDED`.
9. Else allow.
10. Persistence of `POLICY_BLOCKED` / EventBridge happens in later checkpoints, not in this engine.

## Typed contracts

Canonical TypeScript types live in `packages/contracts/src/`. C1.3 added `INVALID_POLICY`, `INVALID_RUN_STATE`, and `UNSUPPORTED_ACTION_ARGUMENTS` to `PolicyReasonCode`, and optional `stableSignature` on `PolicyDecision`. The repeated-action code remains `MAX_REPEATED_ACTION_EXCEEDED`.

## Event types

`RUN_CREATED`, `RUN_STARTED`, `MODEL_CALL_ALLOWED`, `MODEL_CALL_COMPLETED`, `TOOL_CALL_ALLOWED`, `TOOL_CALL_COMPLETED`, `TOOL_CALL_FAILED`, `POLICY_EVALUATED`, `POLICY_BLOCKED`, `BREAKER_TRIPPED`, `RUN_COMPLETED`, `RUN_FAILED`.

## API (implemented later)

- `POST /runs` — idempotency key required; body `{ scenario, policyId }`
- `GET /runs/{runId}`
- `GET /runs/{runId}/events` — ordered by sequence
- `POST /runs/{runId}/reset` — demo state only
- `POST /runs/{runId}/replay` — new run from snapshot + selected policy
- `GET /policies`, `POST /policies`, `PATCH /policies/{policyId}` — Zod; existing runs keep snapshots

## Out of scope until core works

Embeddings, vector DBs, real finance systems, payments, email/SMS, SSO, multi-region, WebSockets, universal framework hooks, exact billing reconciliation, arbitrary public tools.
