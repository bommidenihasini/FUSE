# Fuse

The circuit breaker for autonomous AI agents.

Fuse sits between an integrated agent runner and its Bedrock/tool calls. It enforces per-run limits on steps, estimated cost, runtime, retries, and repeated actions. When a limit is crossed, Fuse **blocks the next invocation**, publishes an AWS event, and records exactly why the run stopped.

This is a hackathon prototype. It is not an enterprise platform.

## What this repo proves

A Bedrock-powered agent starts repeating model/tool calls; Fuse evaluates each next call, blocks the next invocation after a policy violation, emits an AWS event, and preserves an auditable timeline.

## Status

Local synthetic demo and AWS synthetic deploy are available. **Live Bedrock Converse is still off** (`FUSE_LIVE_BEDROCK=false`) until AWS account verification allows it.

## Run locally

```bash
pnpm install
pnpm api:dev
pnpm ui:dev
```

## Deploy (synthetic, us-east-1, profile `fuse-dev`)

```bash
pnpm install
pnpm aws:deploy
```

Uses `AWS_PROFILE=fuse-dev`. Outputs `FuseDashboardUrl` and `FuseApiUrl`. This is not a live Bedrock demo.

## Runtime

Target **Node.js 22.x**. This repo’s `package.json` `engines` and `.nvmrc` pin 22. Local Node 24 is acceptable only if you avoid Node 24-only APIs; prefer `nvm use 22`.

## Synthetic demo data

The public demo uses fictional invoice records only. Never connect real financial, vendor, customer, or personal data.

## Stack

pnpm · TypeScript · Node 22 · AWS CDK (not SAM) · Lambda · API Gateway HTTP API · DynamoDB · EventBridge · CloudWatch · Amazon Bedrock Converse · Amplify Hosting

## Docs

- [AGENTS.md](./AGENTS.md) — persistent agent rules
- [docs/architecture.md](./docs/architecture.md) — CDK architecture freeze
- [docs/requirements.md](./docs/requirements.md) — contracts and state machine
- [docs/claims.md](./docs/claims.md) / [docs/limitations.md](./docs/limitations.md)
- [docs/design-tokens.md](./docs/design-tokens.md)
- [docs/checkpoints.md](./docs/checkpoints.md)
- [docs/day0-inventory.md](./docs/day0-inventory.md)

## Honesty

Cost values are **estimates**. Fuse does not claim exact AWS billing, universal framework interception, or cancellation of already-running requests.
