# Claims (what Fuse may say)

Every user-visible claim must be backed by implemented behavior. If a sentence below is not yet built, it is a **target claim** and must not appear in the public UI until verified.

## Implemented in C1.3 (pure engine)

- Pre-call evaluation for the four limits is implemented as a pure function. It **blocks the next integrated invocation** in the decision object. It does **not** cancel a call that already started and does **not** call AWS.
- Repeated-action detection uses **normalized signatures**, not embeddings.
- Cost values in the decision are the **caller-supplied estimates**, never a live bill.

## Allowed claims (MVP targets still requiring later checkpoints)

1. Fuse is a **pre-call policy gate** for an **integrated** Bedrock + tool runner.
2. Fuse evaluates **each next** model or tool invocation against the run’s policy snapshot.
3. On violation, Fuse **blocks the next invocation** so the underlying Bedrock/tool call **does not execute**.
4. Four limits: steps, **estimated** cost, runtime, repeated normalized actions.
5. Repeated-action detection uses a **deterministic** stable signature (sorted keys), not embeddings.
6. Runs and events persist in **DynamoDB**; breaker trips publish **EventBridge**.
7. The dashboard reflects **backend state**, not a disconnected animation.
8. Replay produces a **new run ID**; the original terminal run stays immutable.
9. Demo data is **synthetic**.
10. AWS provides monitoring and infrastructure controls; Fuse adds **per-run enforcement** for this workflow.

## Language that must appear

- **Estimated run cost** / estimated — never “the AWS bill” or “exact cost”.
- **Next invocation blocked** — when status is `BREAKER_TRIPPED`.
- **Synthetic demo data**.
- Live vs **simulation** must be labeled; simulation must never be called live Bedrock.

## Claims that require live verification before saying “live”

- A real Bedrock Converse call was recorded.
- A real tool execution occurred in live mode.
- An EventBridge `BreakerTripped` event was received in the AWS account.

Until C0.2 blockers clear, do not claim live AWS verification.
