# Fuse architecture (C0.2 freeze)

## Product goal

Fuse is the circuit breaker for autonomous AI agents.

The MVP proves one behavior: a Bedrock-powered integrated agent starts repeating model or tool calls; Fuse evaluates **each next call** through `beforeCall`, **blocks the next invocation** after a policy violation, publishes an AWS event, and preserves an auditable timeline.

Fuse **blocks the next integrated invocation**. It does **not** claim to cancel every already-running request, intercept arbitrary agents, or replace AWS monitoring and billing.

## Selected infrastructure

- **AWS CDK in TypeScript** — the only infrastructure tool.
- **Not SAM.** Do not add SAM templates, `.aws-sam` workflows, or a second IaC stack.
- **No deploy in C0.2.** CDK packages and stack constructs are added at C1.4 after contracts exist.
- **pnpm** workspaces. Runtime target **Node.js 22.x** for Lambda and local development.

## Runtime: Node.js 22.x

| Item | Decision |
| --- | --- |
| Target | Node.js **22.x** (`>=22 <23`) |
| Lambda | `nodejs22.x` when functions are created |
| Local | Use Node 22 (`nvm use` / `.nvmrc`). This machine currently reports Node **24.18.0**. Do not use Node 24-only APIs. |
| Pin files | `.nvmrc`, `.node-version`, root `package.json` `engines.node` |

## AWS services that will actually be implemented

Only these services are in the MVP. Do not add an architecture icon for a service that is not built.

| Service | Responsibility |
| --- | --- |
| **Amazon Bedrock** | Real model invocation via the **Converse API** with **tool use** for the three allowlisted synthetic invoice scenarios. |
| **AWS Lambda** | Control-plane HTTP handlers, policy wrapper (`beforeCall` / `afterCall` / `tripBreaker`), and the controlled agent runner. |
| **API Gateway HTTP API** | Public control-plane: runs, events, policies, reset, replay, health. |
| **DynamoDB** | `FuseRuns` (run summary + policy snapshot), `FuseEvents` (append-only ordered ledger), policies. Conditional writes for event sequence and terminal-state protection. |
| **EventBridge** | `BreakerTripped` and run lifecycle events on a dedicated bus. |
| **CloudWatch** | Lambda logs and operational evidence. |
| **Amplify Hosting** | Public React dashboard (and landing page) with no secrets in the browser bundle. |

### Explicitly not in the MVP stack

- **Step Functions** — not required; the runner Lambda owns the tool loop.
- **S3** — only if replay-trace export is added later; not planned for C0.
- **OpenSearch, SQS, SNS, Cognito, WAF, multi-region** — out of scope.

IAM roles are part of CDK, not extra product services. Use least privilege. No administrator roles.

## Call path

```
React dashboard (Amplify Hosting)
        │
        ▼
API Gateway HTTP API
        │
        ▼
Lambda control plane
   │         │
   │         ├── EventBridge (breaker + lifecycle)
   │         └── DynamoDB (policies, runs, events)
   └── runner Lambda
            │
            ▼
     Fuse policy wrapper (beforeCall)
            │
            ├── allow → Bedrock Converse / synthetic tool → afterCall
            └── deny  → persist POLICY_BLOCKED + BREAKER_TRIPPED
                         publish EventBridge
                         do not execute the underlying call
            │
            ▼
     CloudWatch logs
```

## Bedrock Converse API and tool use

Live mode uses Amazon Bedrock **Converse** with **tool use**, not a custom agent framework and not arbitrary tools.

- Every model call and every tool call must pass through `beforeCall`.
- A denied decision must not invoke Bedrock or the tool function.
- Public mode allows only synthetic `verify_vendor` (and any later allowlisted demo tools) plus the three invoice scenarios.
- **Model ID and region are not frozen.** They remain placeholders until a human verifies account access.

## Live Bedrock mode vs simulation mode

| Mode | Meaning | Label |
| --- | --- | --- |
| **Live Bedrock** | Real Converse API calls in the development/demo AWS account, still behind Fuse and public limits. | Must be labeled live. Never fake this with a recording. |
| **Simulation** | Deterministic local/synthetic runner that still goes through `beforeCall` and persists the same event types. Used when Bedrock is unavailable or the kill switch is on. | Must be labeled simulation. Never presented as a live Bedrock run. |

If Bedrock is unavailable: honest failure + offer simulation. Fail closed if policy evaluation or the required audit write cannot be trusted.

## Required environment variables

Placeholders only until deploy. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `AWS_REGION` | Development region **after** `aws configure get region` / STS succeeds. Placeholder: `<development-region>` |
| `BEDROCK_MODEL_ID` | Approved Converse-capable model ID **after** Bedrock access is verified. Placeholder: `<approved-model-id>` |
| `FUSE_RUNS_TABLE` | Deployed DynamoDB runs table name |
| `FUSE_EVENTS_TABLE` | Deployed DynamoDB events table name |
| `FUSE_POLICIES_TABLE` | Deployed DynamoDB policies table name |
| `FUSE_EVENT_BUS_NAME` | Deployed EventBridge bus name |
| `FUSE_API_URL` | HTTP API base URL |
| `PUBLIC_DEMO_MODE` | `true` for judge-facing limits |
| `FUSE_LIVE_BEDROCK` | Kill switch: `true` only when model access is verified |

## Procedure to verify AWS region and Bedrock model access

Do not guess. Run these in a development account only.

1. Install AWS CLI v2 and authenticate a **least-privilege development** profile (not production).
2. `aws sts get-caller-identity` — confirm account and principal.
3. `aws configure get region` (or the profile’s region). Record that value as `AWS_REGION`. Do not copy a region from blogs.
4. Confirm Bedrock is available in **that** region: `aws bedrock list-foundation-models --region <verified-region>`.
5. Pick a model that supports **Converse** and **tool use**. Record the exact model ID as `BEDROCK_MODEL_ID`.
6. Optionally run a tiny Converse smoke test from CloudShell or a locked-down role.
7. Set a billing/spending alarm if the account allows it.
8. Update `.env` locally (gitignored) and `docs/decision-log.md` with the verified region and model ID.

C0.2 verification on this machine (2026-09-18):

- AWS CLI: **not installed**
- `AWS_REGION` / `AWS_DEFAULT_REGION` / `AWS_PROFILE`: **unset**
- `~/.aws/credentials` and `~/.aws/config`: **absent**
- `BEDROCK_MODEL_ID`: **unset**
- Result: **region unknown, model access unknown**

## Exact deployment blockers

Until the procedure above succeeds, **do not deploy** and **do not claim live Bedrock**.

1. No AWS CLI on the PATH.
2. No configured AWS profile or credentials files.
3. No verified `AWS_REGION`.
4. No verified `BEDROCK_MODEL_ID` or Converse/tool-use entitlement.
5. CDK is project-local (`pnpm infra:synth`). Still do not deploy without a verified region and credentials.
6. Local Node is 24.18.0; Lambda and documented workflow must still target 22.x.

## CDK stack (C1.4)

Synthesize with `pnpm infra:synth` (`tsc` then `cdk synth` in `infra/`). **Do not deploy** until credentials, region, and (for live Bedrock) model access are verified.

Stack id: `FuseMvp`. Environment-agnostic (region is `AWS::Region` at deploy time). No guessed region or model ARN.

| Resource | Purpose |
| --- | --- |
| `FuseRuns` DynamoDB | PK `runId`, PAY_PER_REQUEST, PITR on. `RemovalPolicy.DESTROY` is **development-only**. |
| `FuseEvents` DynamoDB | PK `runId`, SK `sequence` (Number), PAY_PER_REQUEST, PITR on. Conditional writes: `PutItem` with `attribute_not_exists(runId)` so a given `(runId, sequence)` cannot be overwritten. Implemented in `@fuse/persistence` (`DynamoFuseRepository.appendEvent`). |
| Event bus `fuse-breaker` | Planned `BreakerTripped` events: source `fuse.breaker`, detail-type `BreakerTripped`. No fake event rules. |
| `FuseControlFn` / `FuseRunnerFn` | Node.js 22 placeholders (health / 501). Not a complete API or runner. |
| `FuseControlRole` / `FuseRunnerRole` | DynamoDB read/write on the two tables, `events:PutEvents` on `fuse-breaker`, CloudWatch write on each function’s log group. **No administrator policy. No `bedrock:InvokeModel` until a verified model ID exists** (least-privilege blocker). |
| HTTP API `fuse-http-api` | `GET /health` only. |
| Log groups | 7-day retention, DESTROY in development. |
| Outputs | `FuseRunsTableName`, `FuseEventsTableName`, `FuseEventBusName`, `FuseApiUrl`, `FuseRegion`, `FuseStackName`. |

Lambda env: `BEDROCK_MODEL_ID=<approved-model-id>`, `FUSE_LIVE_BEDROCK=false`. `AWS_REGION` is not invented in CDK; Lambda/CloudFormation supply it at deploy.

`FusePolicies` table is **not** in C1.4 (deferred until policy API persistence). Amplify Hosting is not in this stack.

## Persistence (C1.5)

`@fuse/persistence` implements DynamoDB SDK v3 repositories against `FuseRuns` and `FuseEvents`. Policies are the run’s stored snapshot (`getPolicySnapshot`). No EventBridge publish, Bedrock, API, or deploy in this layer. Timestamps are caller-supplied; run IDs are server-generated.

## Enforcement wrapper (C1.6)

`@fuse/enforcement` (`Fuse.beforeCall` / `afterCall` / `tripBreaker` / `invokeTool` / `invokeModel`) evaluates each next call, persists the ledger, and **does not invoke** the supplied function when denied. Clock and EventBridge-shaped notices are injected. No runner, API, Bedrock client, or `cdk deploy` in this package.

## Synthetic runner (C1.7A)

`@fuse/runner` (`InvoiceVerificationRunner`) drives the three allowlisted invoice scenarios through `Fuse.invokeModel` / `invokeTool`. It is **simulation only**: synthetic `simulate_invoice_planner` + `verify_vendor`, hard iteration cap, no Amazon Bedrock, no EventBridge, no API, no UI, no deploy.

## HTTP API (C2.0)

`@fuse/api` exposes `GET /health`, `POST /runs`, `GET /runs/{runId}`, `GET /runs/{runId}/events`, and `GET /policies` over the synthetic runner and an in-memory repository. Health always returns `mode: "synthetic"` and `liveBedrock: false`. Local listen: `pnpm api:dev`. CDK still deploys only `GET /health` as an inline Lambda until a bundled handler is deployed. No frontend. No live Bedrock. No EventBridge publish.

## CDK layout

```
infra/
  bin/app.ts
  lib/fuse-stack.ts
  cdk.json
  tsconfig.json
```

Do not `cdk deploy` until credentials, region, and (for live mode) model access are verified.
