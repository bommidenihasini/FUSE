# Fuse

The circuit breaker for autonomous AI agents.

Fuse evaluates proposed model and tool invocations against a policy, blocks the next invocation when a policy violation is detected, and preserves an ordered audit timeline.

> **Current status:** Fuse is a deterministic synthetic MVP. Live Amazon Bedrock Converse API invocation is disabled with `FUSE_LIVE_BEDROCK=false` pending AWS account verification. The current demonstration runs locally and has not been deployed to AWS.

- **Jump to:** [Demo Flow](#demo-flow) | [Local Setup](#local-setup) | [API Reference](#api-documentation) | [Architecture](#architecture) | [Limitations](#limitations-and-current-status)

---

## Core concept

Autonomous agents can loop, retry indefinitely, or continue making model and tool calls after useful progress has stopped. Fuse adds a pre-call policy gate that evaluates the next integrated invocation before execution.

### Evaluation & enforcement flow

```text
Agent proposes an action
        ↓
Fuse evaluates the next invocation
        ↓
Policy allows or blocks
        ↓
Allowed call executes
        ↓
Decision is persisted
        ↓
Audit timeline records the result
```

### Core proof (breaker trip)

```text
Repeated action detected
→ Policy violation
→ Next invocation blocked before execution
→ BREAKER_TRIPPED
→ Ordered audit evidence preserved
```

### Safe workflow path

```text
Valid workflow
→ Policy allows calls
→ Workflow completes
→ COMPLETED
→ Completion evidence is recorded
```

The primary proof is not that Fuse can display a warning. The proof is that a denied invocation does not reach the underlying executor, while the policy decision and breaker trip remain visible in the audit timeline.

---

## Verified demo scenarios

The synthetic runner implements three deterministic scenario flows. All scenarios run against synthetic demo data.

| Scenario | Purpose | Expected Result |
| --- | --- | --- |
| `invoice-verification-loop` | Demonstrates repeated-action protection | `BREAKER_TRIPPED` (`MAX_REPEATED_ACTION_EXCEEDED`) |
| `safe-completion` | Demonstrates valid work completing within policy | `COMPLETED` |
| `bounded-tool-error` | Demonstrates bounded synthetic error handling | `BREAKER_TRIPPED` (`MAX_REPEATED_ACTION_EXCEEDED`) |

> *All scenarios are synthetic demo scenarios operating on fictional invoice data.*

---

## Demo flow

Follow this sequence to reproduce the breaker trip and safe completion evidence in the dashboard:

1. **Start the API server** (`pnpm api:dev`).
2. **Start the frontend dashboard** (`pnpm ui:dev`).
3. Open the dashboard in a browser at [http://localhost:5173](http://localhost:5173).
4. Verify the top bar displays **SYNTHETIC DEMO MODE** and **FUSE_LIVE_BEDROCK=false**.
5. On the **Overview** tab, click **Start Invoice Loop**.
6. Observe the terminal run card status transition to **BREAKER TRIPPED**.
7. Confirm the decision details state **Next invocation blocked** with reason code `MAX_REPEATED_ACTION_EXCEEDED`.
8. Open the **Audit Timeline** tab to inspect the sequence of events.
9. Verify that after `POLICY_BLOCKED` is emitted, no further tool or model calls were executed.
10. Return to the **Overview** tab and click **Run Safe Completion**.
11. Observe the terminal status transition to **RUN COMPLETED SAFELY** (`COMPLETED`).
12. Inspect the audit timeline for the completed run to view the `RUN_COMPLETED` event.
13. Navigate to **Policies** and **Architecture** to review policy parameters and AWS system design.

---

## Local setup

### Prerequisites

- **Node.js**: `22.x` (`engines: ">=22 <23"`)
- **Package Manager**: `pnpm` `>=9` (repository configured with `pnpm@11.7.0`)
- **Git**
- *No AWS account or live cloud credentials are required for the local synthetic demo.*

### Installation

```bash
git clone https://github.com/bommidenihasini/FUSE.git
cd FUSE
pnpm install
```

### Running locally

Run the API and Dashboard in separate terminal windows:

**Terminal 1 — HTTP API Server**
```bash
pnpm api:dev
```
*API endpoints serve at:* `http://127.0.0.1:8787`

**Terminal 2 — Frontend Dashboard**
```bash
pnpm ui:dev
```
*Dashboard serves at:* `http://localhost:5173`

### Environment variables

Copy `.env.example` to `.env` if custom environment variables are needed:

```bash
AWS_REGION=<development-region>
BEDROCK_MODEL_ID=<approved-model-id>
FUSE_RUNS_TABLE=<deployed-table-name>
FUSE_EVENTS_TABLE=<deployed-table-name>
FUSE_POLICIES_TABLE=<deployed-table-name>
FUSE_EVENT_BUS_NAME=<deployed-event-bus>
FUSE_API_URL=<deployed-api-url>
PUBLIC_DEMO_MODE=true
FUSE_LIVE_BEDROCK=false
```

---

## API documentation

The HTTP API provides a lightweight control surface over the enforcement runner.

| Method | Path | Purpose | Key Parameters / Headers |
| --- | --- | --- | --- |
| `GET` | `/health` | Service health status | Returns service name, mode, and `liveBedrock: false` |
| `GET` | `/policies` | List demo policies | Returns `policy-demo-strict` and `policy-demo-lenient` |
| `POST` | `/runs` | Start a new synthetic scenario run | Body: `{ "scenario": "invoice-verification-loop", "policyId": "policy-demo-strict" }`<br>Header: `Idempotency-Key` (required) |
| `GET` | `/runs/:runId` | Retrieve run details | Returns run envelope (`nextInvocation: "BLOCKED"` on breaker trip) |
| `GET` | `/runs/:runId/events` | Retrieve ordered audit events | Returns event array sorted by sequence number |

### POST /runs Request Schema

```json
{
  "scenario": "invoice-verification-loop",
  "policyId": "policy-demo-strict"
}
```

> **Idempotency Header:** `POST /runs` requires an `Idempotency-Key` header (e.g. UUID) to prevent accidental duplicate run creation.

> **Note on Run History:** The current MVP does not provide a historical `GET /runs` list endpoint. The dashboard tracks the current session locally in `sessionStorage`.

---

## Architecture

### Local execution architecture

```text
Dashboard (React 19 / Vite)
    ↓
HTTP API (@fuse/api / Node.js)
    ↓
Synthetic Runner (@fuse/runner)
    ↓
Policy Engine (@fuse/policy-engine)
    ↓
Enforcement Wrapper (@fuse/enforcement)
    ↓
Persistence Repository (@fuse/persistence)
    ↓
Ordered Audit Timeline
```

### Module breakdown

- `apps/dashboard` — React 19 frontend dashboard, interactive controls, and visual timelines.
- `apps/api` — Local HTTP API router for health checks, policy queries, and run execution.
- `apps/runner` — Deterministic scenario driver (`InvoiceVerificationRunner`).
- `packages/api` — API schemas, policy definitions, and handler implementation.
- `packages/contracts` — Shared TypeScript types, event schemas, and domain interfaces.
- `packages/policy-engine` — Pure evaluation gate evaluating runtime, steps, estimated cost, and repeated actions.
- `packages/enforcement` — `Fuse` class implementing `beforeCall` pre-check and `afterCall` auditing.
- `packages/persistence` — In-memory repository implementation and DynamoDB mapper.
- `packages/pricing` — Fallback pricing estimates per model/tool call.
- `packages/runner` — Invoice verification logic and simulation runner.
- `packages/test-fixtures` — Allowlisted synthetic invoice records and scenario fixtures.
- `infra` — AWS CDK TypeScript stack definitions.
- `docs` — Architecture decisions, audit records, and governance specifications.

### Planned AWS Cloud architecture

```text
API Gateway (HTTP API)
    ↓
Lambda (Control & Enforcement Function)
    ↓
Synthetic Runner / Policy Gate
    ↓
DynamoDB (Runs, Events, & Policies Tables)
    ↓
EventBridge (BreakerTripped Event Bus) & CloudWatch
```

- **EventBridge**: Stack configured in CDK (`infra/lib/fuse-stack.ts`); event emission enabled in AWS infrastructure.
- **Amazon Bedrock**: Live Converse API invocation disabled (`FUSE_LIVE_BEDROCK=false`) pending AWS account verification.
- **AWS deployment**: CDK stack synthesized; live cloud deployment pending AWS verification.

---

## Project structure

```text
.
├── apps/
│   ├── api/
│   ├── dashboard/
│   └── runner/
├── packages/
│   ├── api/
│   ├── contracts/
│   ├── enforcement/
│   ├── persistence/
│   ├── policy-engine/
│   ├── pricing/
│   ├── runner/
│   └── test-fixtures/
├── infra/
│   ├── bin/
│   ├── iam/
│   └── lib/
├── docs/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## Verification & testing

The codebase enforces strict quality checks across format, types, unit tests, frontend build, and CDK synthesis.

### Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm infra:synth
git diff --check
```

### Verification results

- **Test Suite**: **15 test files passed (125 tests passed)**
- **Format & Lint**: Passed with zero warnings or errors.
- **Typecheck**: Clean compile across workspace, infra, and dashboard.
- **Build**: Vite production client bundle compiled cleanly (`dist/assets`).
- **CDK Synth**: CloudFormation template successfully synthesized (`FuseMvpTest`).
- **Browser E2E Note**: A Playwright/browser E2E suite is not currently configured; the local judge flow was manually verified.

### Scope of automated test coverage

- Pure policy evaluation across all 4 policy constraints.
- Deterministic stable action normalization and key sorting.
- Enforcement gate blocking (ensuring denied functions never execute).
- State machine transitions (`RUNNING` → `BREAKER_TRIPPED` / `COMPLETED`).
- Audit event ordering and sequence continuity.
- Synthetic scenario fixture execution.
- Zod request body and parameter validation.
- Key-based sensitive metadata redaction.
- AWS CDK infrastructure stack synthesis.

---

## Limitations and current status

- **Live Bedrock Invocation:** Live Bedrock Converse API invocation is disabled with `FUSE_LIVE_BEDROCK=false` pending AWS account verification.
- **Synthetic Scenarios:** Demonstrations execute against deterministic synthetic scenarios (`invoice-verification-loop`, `safe-completion`, `bounded-tool-error`).
- **AWS Cloud Deployment:** AWS cloud deployment is not included in the current submission.
- **Session Ledger:** The dashboard run ledger uses `sessionStorage` because no historical `GET /runs` endpoint is implemented.
- **Read-Only Policies:** Policy definitions are read-only (`GET /policies`). `POST /policies` and `PATCH /policies/:policyId` are not implemented.
- **Cost Estimation:** Estimated run cost uses static catalog models, not live AWS Cost Explorer billing.
- **Pre-Call Interception:** Fuse evaluates and blocks the *next* integrated invocation (`beforeCall`). It does not cancel an in-flight HTTP request that has already executed.

---

## Security notes

- **No Secrets in Repo:** Never commit `.env` or AWS credential files.
- **Frontend Safety:** No AWS access keys or secret credentials exist in frontend code.
- **Allowlisted Execution:** Synthetic tool invocations are strictly allowlisted to fixed local handlers (`verify_vendor`).
- **Metadata Redaction:** Sensitive event metadata keys (such as `token`, `password`, `key`) are automatically redacted prior to audit logging.
- **Disabled Bedrock:** `FUSE_LIVE_BEDROCK` defaults to `false`.
- **IAM Policy Review:** Review IAM roles in `infra/iam/` prior to production AWS deployment.

---

## Demo video

- **Recommended flow:** Overview → Start Invoice Loop → BREAKER TRIPPED → Next invocation blocked → Audit timeline → Overview → Run Safe Completion → RUN COMPLETED SAFELY → Policies → Architecture
- **Recommended length:** 2–3 minutes
- **Description:** The video demonstrates Fuse blocking a repeated autonomous agent loop before the tool executor runs, showing the recorded policy decision in an ordered audit timeline, and demonstrating safe completion of a valid invoice verification workflow.

*Demo video: to be added*
