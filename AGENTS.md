# Fuse — Agent instruction manual

Read this file before changing code. Fuse is a hackathon prototype, not an enterprise platform.

## Mission

Prove one behavior: a Bedrock-powered integrated agent starts repeating model/tool calls; Fuse evaluates each next call, blocks the next invocation after a policy violation, emits an AWS event, and preserves an auditable timeline.

One-line pitch: Fuse is the circuit breaker for autonomous AI agents.

## Differentiated claim

AWS provides visibility and infrastructure controls. Fuse provides per-run, pre-call enforcement for integrated agent workflows.

Never claim exact billing, universal framework support, arbitrary-agent interception, or cancellation of every already-running request.

## Scope — must build

1. One real Amazon Bedrock Converse API model call.
2. One real tool-calling runner.
3. One `beforeCall` policy gate before every model/tool call.
4. Four policies: max steps, max estimated cost, max runtime, max repeated normalized action count.
5. One real denial that prevents the next underlying call.
6. DynamoDB run and event records.
7. EventBridge `BreakerTripped` event.
8. Live dashboard using backend state.
9. Replayable audit timeline.
10. Safe-completion scenario.
11. Public judge mode with strict limits.

## Scope — do not build before the core works

Universal framework support, embeddings/vector DBs, real finance integrations, payments, email/SMS, multi-region, SSO, exact billing reconciliation, arbitrary public tool execution, WebSockets, a custom agent framework.

A deterministic normalized-action detector is enough for the MVP.

## Demo

Fictional invoice-verification agent. Synthetic records only. Label the interface **Synthetic demo data**. Never connect to real invoice, payment, vendor, customer, or personal data.

Scenarios:

- Runaway retry (`invoice-verification-loop`)
- Safe completion (`invoice-verification-safe`)
- Bounded tool failure (`invoice-verification-tool-error`)

## Stack freeze (C0.2)

- TypeScript; **Node.js 22.x** (`engines`: `>=22 <23`). Local Node may be 24.x — do not use Node 24-only APIs. Use `.nvmrc`.
- Package manager: **pnpm**
- Infrastructure: **AWS CDK (TypeScript) only**. Not SAM.
- AWS: Bedrock Converse + tool use, Lambda, API Gateway HTTP API, DynamoDB, EventBridge, CloudWatch, Amplify Hosting.
- **Region and Bedrock model ID are unverified placeholders.** Do not invent them.
- Frontend (later): React 19, Vite, Tailwind CSS 4, shadcn/ui, Radix, Motion, Lucide, Recharts, TanStack Query, React Hook Form, Zod. Tokens in `docs/design-tokens.md`.
- Testing (later): Vitest, Playwright, ESLint, Prettier

## Architecture rule

All model and tool calls must pass through `beforeCall`. A denied call must not execute the underlying call. Fail closed when the policy decision or required audit write cannot be trusted. Label all cost values as estimates.

## Wrapper contract

```ts
const decision = await fuse.beforeCall({ runId, kind: "tool", name: "verify_vendor", arguments });
if (!decision.allowed) {
  await fuse.tripBreaker(runId, decision.reason);
  throw new BreakerTrippedError(decision.reason);
}
const result = await executeTool();
await fuse.afterCall({ runId, result });
```

## Policy evaluation order

1. Confirm the run is `RUNNING`.
2. Check runtime limit.
3. Check whether the next step exceeds `maxSteps`.
4. Check whether estimated cost exceeds `maxEstimatedCostUsd`.
5. Calculate normalized action signature.
6. Check repeated-action count.
7. Return allow or block.
8. If blocked: persist `POLICY_BLOCKED` and `BREAKER_TRIPPED`, publish EventBridge, do not execute the call.

## Public demo limits

One concurrent run per session, max 30 seconds, max eight steps, fixed synthetic tools only, no arbitrary prompts/URLs/code, rate limiting, reset, kill switch for live Bedrock.

## Security

Never accept arbitrary code, URLs, tool definitions, or unbounded prompts. No AWS credentials in frontend. Validate all input on the server with Zod. Least-privilege IAM. If Bedrock is unavailable, show an honest failure and offer simulation mode. Never present a pre-recorded run as a live Bedrock run.

## Testing

Every changed behavior requires a test. Policy and state transitions need unit tests. Integration tests must prove a denied decision prevents the underlying tool from executing. Never mark a feature complete without a test or reproducible verification.

## Agent operating protocol

Work only in the current checkpoint. Do not jump ahead. After each checkpoint: run required tests, inspect the diff, update `docs/checkpoints.md`, and stop when the checkpoint says STOP.

Loop: read → plan → edit → test → inspect diff → report → checkpoint.

Never invent AWS resource names or credentials. Never silently replace live behavior with simulation. Never add an AWS service only for diagram decoration. Ask for human input only for credentials, account permissions, or a materially different product decision.

## Definition of done

A clean-browser judge can start a live or honestly labeled simulated run without setup, watch an agent repeat an action, see Fuse block the next invocation, inspect the persisted timeline, modify a policy, run a safe scenario, and understand exactly which AWS services are genuinely implemented.
