# Decision log

## 2026-09-18 — C0.1 repository bootstrap

- Package manager: **pnpm** (installed locally; playbook prefers pnpm when the team knows it).
- Infrastructure tool: **AWS CDK proposed** (one tool, not both CDK and SAM). Human must approve at C0.2.
- Node: playbook targets **Node 22**. Local machine reports **v24.18.0**. Stay on 24 only if C0.2 accepts it; otherwise pin 22 via `.nvmrc` / engines.
- AWS CLI, CDK CLI, and SAM CLI are **not installed** on this machine.
- No application code in C0.1.

## 2026-09-18 — C0.2 stack freeze

- Infrastructure: **AWS CDK (TypeScript)**. **Not SAM.**
- Runtime: **Node.js 22.x** (`engines.node`: `>=22 <23`). `.nvmrc` / `.node-version` = `22`.
- Local Node remains **24.18.0**; do not use Node 24-specific APIs; develop on 22 when possible.
- AWS inspection: CLI **missing**; env `AWS_REGION`, `AWS_DEFAULT_REGION`, `AWS_PROFILE`, `BEDROCK_MODEL_ID` **unset**; `~/.aws/credentials` and `~/.aws/config` **absent**.
- **AWS region: unverified** — placeholder `<development-region>` only.
- **Bedrock model ID: unverified** — placeholder `<approved-model-id>` only. No live Converse test.
- Services in MVP: Bedrock, Lambda, API Gateway HTTP API, DynamoDB, EventBridge, CloudWatch, Amplify Hosting. No Step Functions.
- Live vs simulation documented. `FUSE_LIVE_BEDROCK=false` in `.env.example`.
- CDK: `infra/cdk.json` + `infra/tsconfig.json` + `infra/package.json` only. No `cdk deploy`, no stack constructs, no `node_modules` install.

## 2026-09-18 — C0.3 contracts

- Requirements, claims, limitations written.
- `@fuse/contracts` types only: Policy, RunStatus, Run, EventType, Event, BeforeCallInput, PolicyDecision, ToolRequest, ToolResult.
- No policy engine, repositories, runner, API, or UI.

## 2026-09-18 — C0.4 design tokens

- Palette, type (Sora / IBM Plex Sans / JetBrains Mono), spacing, radius, motion, a11y, dashboard and landing direction, 3D boundary.
- No UI packages installed.

## 2026-09-18 — C1.1 contracts and fixtures

- Vitest for unit tests (no extra assertion libraries).
- TypeScript **5.9.3** (not 7): `typescript-eslint` 8.x does not support TS 7.0.
- Root `package.json` `"type": "module"` so Vitest/ESLint configs load as ESM.
- `.npmrc` `engine-strict=false` so local Node 24 can install while `engines.node` stays `>=22 <23`.
- Canonical scenario IDs for fixtures: `invoice-verification-loop`, `safe-completion`, `bounded-tool-error` (C1.1). Playbook names `invoice-verification-safe` and `invoice-verification-tool-error` are not used as primary IDs.

## 2026-09-18 — C1.2 stable signatures

- Unsupported values **throw** (`UnsupportedSignatureValueError`); they are not coerced into JSON.
- `normalizeAction` redacts known sensitive keys before stringify so prompts/secrets are not stored in signatures.
- Finite numbers use JSON number serialization (`-0` becomes `0`).

## 2026-09-18 — C1.3 pure policy engine

- Precedence: invalid policy → invalid run state → not RUNNING → runtime ≥ limit → next step would exceed → estimated cost would exceed → unsupported args → repeated count would exceed.
- Runtime uses **≥**. Steps/cost/repeats use **would exceed** after applying the next call (cost equality allowed).
- Reason code stays `MAX_REPEATED_ACTION_EXCEEDED`. Added `INVALID_POLICY`, `INVALID_RUN_STATE`, `UNSUPPORTED_ACTION_ARGUMENTS`.
- `PolicyDecision.stableSignature` is optional. Evaluator does not call the clock or AWS.
- Estimated-cost equality is `current + proposed > max` with IEEE floats; boundary tests use exact binary fractions (0.125 + 0.125 = 0.25).

## 2026-09-18 — C1.4 CDK synth

- Stack `FuseMvp`, CDK `aws-cdk-lib` 2.269, CLI `aws-cdk`, Node.js 22 Lambdas.
- Environment-agnostic stack: region is `AWS::Region`, not a guessed value.
- No Bedrock IAM while model ID is `<approved-model-id>`.
- Event bus name `fuse-breaker`; planned source `fuse.breaker`, detail-type `BreakerTripped`.
- DynamoDB PAY_PER_REQUEST + PITR; DESTROY is development-only.
- Synth command: `pnpm infra:synth` (`tsc -p tsconfig.json && cdk synth` in `infra/`). No deploy.
- `FusePolicies` table deferred. No Step Functions/S3/Cognito.
- pnpm `ignored-built-dependencies` includes `esbuild` (unused after dropping tsx).

## 2026-09-19 — C1.5 DynamoDB repositories

- Package `@fuse/persistence` with `InMemoryFuseRepository` and `DynamoFuseRepository` (AWS SDK v3).
- Allowed transitions: CREATED→RUNNING; RUNNING→COMPLETED|FAILED|BREAKER_TRIPPED.
- Event append uses `attribute_not_exists(runId)` on `(runId, sequence)`. Duplicate sequences fail closed.
- No policy table. Snapshot lives on the run item.
- No CDK change. No Date.now() in repositories.
- pnpm workspace `allowBuilds.esbuild: false` so ignored esbuild scripts do not fail `pnpm test`.

## 2026-09-19 — C1.6 enforcement wrapper

- Package `@fuse/enforcement` with `Fuse` connecting contracts, `evaluateBeforeCall`, and `FuseRepository`.
- Denied `invokeTool` / `invokeModel` never call the injected executor. Status becomes `BREAKER_TRIPPED`; `POLICY_BLOCKED` metadata records `nextInvocation: BLOCKED`.
- EventBridge is an optional in-process hook (`fuse.breaker` / `BreakerTripped`), not AWS `PutEvents`.
- No Bedrock runner, API handlers, frontend, or deploy.

## 2026-09-19 — C1.7A synthetic runner

- Package `@fuse/runner` with `InvoiceVerificationRunner` for the three synthetic invoice scenarios.
- Loop and tool-error end in `BREAKER_TRIPPED`. Safe completion ends in `COMPLETED`. Safety cap ends in `FAILED`.
- No Bedrock, EventBridge, API, UI, or `cdk deploy`.

## 2026-09-19 — C2.0 minimal HTTP API

- Package `@fuse/api` with Zod-validated health, create-run, get-run, events, and demo policies.
- Always `liveBedrock: false` / `mode: synthetic`. Idempotency-Key on POST /runs. One in-flight demo run.
- No frontend, no live Bedrock, no `cdk deploy` of the full run API. CDK `GET /health` JSON matches the local contract.
