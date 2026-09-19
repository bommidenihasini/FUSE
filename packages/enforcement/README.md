# `@fuse/enforcement`

Pre-call wrapper that connects `@fuse/contracts`, `@fuse/policy-engine`, and `@fuse/persistence`.

When `beforeCall` denies, the injected model or tool function is **not** executed. C1.6 uses fake executors only. There is **no** live Amazon Bedrock call and **no** live EventBridge `PutEvents`.

## Proof

Denied path must show:

- Policy violation detected
- Run status: `BREAKER_TRIPPED`
- Next invocation: **BLOCKED**
- Underlying executions before denial: N
- Underlying executions after denial: still N
- Audit timeline: persisted (`POLICY_EVALUATED`, `POLICY_BLOCKED`, `BREAKER_TRIPPED`)

## Fail closed

If the policy decision or a required audit write cannot be trusted, the wrapper throws `FailClosedError` and does not invoke the underlying function.

An injected `publishBreakerTripped` hook may fail after the ledger is written; that must not unwind the trip and is not a live AWS publish.
