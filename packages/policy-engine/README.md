# `@fuse/policy-engine`

Pure, deterministic pre-call evaluation for Fuse. This package does **not** call AWS, the network, the filesystem, DynamoDB, EventBridge, or Bedrock. It does not read the clock; callers pass `elapsedMs`.

## What it does

`evaluateBeforeCall` decides whether the **next** integrated model or tool invocation may proceed. A denial means **block the next invocation**. It does **not** cancel a call that already started.

Callers must pass estimated cost values; IEEE floating point applies. Tests use exact binary fractions for the equality boundary.

Repeated-action detection uses `normalizeAction` (stable signatures). Different arguments are not duplicates. Key-based redaction of `prompt` / secrets is **not** full secret scanning.

## Evaluation precedence

When several checks would fail, the first code in this list wins:

1. `INVALID_POLICY` — disabled policy, negative or non-finite limits, non-integer step/repeat limits.
2. `INVALID_RUN_STATE` — negative or non-finite counters, invalid kind/status, bad history.
3. `RUN_NOT_RUNNING` — status is not `RUNNING`.
4. `MAX_RUNTIME_EXCEEDED` — `elapsedMs >= maxRuntimeMs`.
5. `MAX_STEPS_EXCEEDED` — `stepCount + 1 > maxSteps`.
6. `MAX_ESTIMATED_COST_EXCEEDED` — `estimatedCostUsd + proposedEstimatedCostUsd > maxEstimatedCostUsd`.
7. `UNSUPPORTED_ACTION_ARGUMENTS` — signature cannot be computed.
8. `MAX_REPEATED_ACTION_EXCEEDED` — matching prior signatures + this call `> maxRepeatedActionCount`.

The code remains `MAX_REPEATED_ACTION_EXCEEDED` (not `...ACTIONS...`) to match C1.1 contracts.

## Threshold semantics

| Control | Block when |
| --- | --- |
| Runtime | elapsed **≥** limit (equality blocks). |
| Steps | current is 5 and max is 6 → **allow**; current is 6 and max is 6 → **block**. |
| Estimated cost | current + proposed **>** limit (equality allows). |
| Repeated action | 2 prior matches, max 3 → **allow** the 3rd; 3 prior matches → **block** the 4th. |

Zero `maxSteps` or `maxRuntimeMs` or `maxRepeatedActionCount` fail closed for a new call.

## Inputs are not mutated

The evaluator copies policy fields into the decision and only reads `priorSignatures`. Callers keep ownership of run, policy, and history arrays.
