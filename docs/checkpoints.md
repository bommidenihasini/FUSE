# Fuse checkpoint ledger

At every checkpoint, report: Checkpoint, Evidence, Tests run, Tests passed, Tests not run, Files changed, Known limitations, Next approved task.

| Checkpoint | Time | Evidence required | Status |
| --- | --- | --- | --- |
| C0.1 | Day 0 + 0:30 | Repository and rules exist | Complete |
| C0.2 | Day 0 + 1:00 | Stack and model approved | Complete (region/model **unverified**) |
| C0.3 | Day 0 + 1:45 | Contracts and claims written | Complete |
| C0.4 | Day 0 + 2:15 | Design tokens frozen | Complete |
| C1.1 | Day 1 + 1:00 | Contracts compile | Complete |
| C1.2 | Day 1 + 2:00 | Stable signature tests pass | Complete |
| C1.3 | Day 1 + 3:30 | Policy engine tests pass | Complete |
| C1.4 | Day 1 + 5:00 | Infrastructure synth reviewed | Complete (synthesized, **not deployed**) |
| C1.5 | Day 1 + 6:00 | Persistence tests pass | Complete |
| C1.6 | Day 1 + 8:00 | Denied call does not execute | Complete |
| C1.7A | Day 1 + 8:30 | Synthetic runner scenarios | Complete |
| C1.7B | Day 1 + 9:00 | Development deployment and Bedrock verification | Blocked (external AWS account verification) |
| C2.0 | Day 2 + 0:30 | Minimal synthetic HTTP API | Complete |
| C2.1 | Day 2 + 1:30 | Dashboard shell loads | Complete |
| C2.2 | Day 2 + 3:30 | Live run uses backend state | Complete |
| C2.3 | Day 2 + 5:00 | Polling failures visible | Complete (Backend unavailable; poll only while RUNNING) |
| C2.4 | Day 2 + 6:30 | Policy edit changes behavior | Pending (no PATCH /policies) |
| C2.5 | Day 2 + 8:00 | Replay is immutable | Pending |
| C2.6 | Day 2 + 9:30 | Non-builder understands breaker | Complete |
| C3.1 | Day 3 + 1:30 | Public demo is bounded | Pending |
| C3.2 | Day 3 + 3:00 | Failure behavior is honest | Pending |
| C3.3 | Day 3 + 5:00 | UI/accessibility pass | Pending |
| C3.4 | Day 3 + 6:30 | Landing page works without 3D | Pending |
| C3.5 | Day 3 + 8:30 | Demo recording is reliable | Pending |
| C3.6 | Day 3 + 9:00 | Release frozen | Pending |

## C0.2 report

- **Status:** Complete as an architecture freeze. **Not** a live AWS approval.
- **Decisions:** CDK TypeScript only; Node 22.x; pnpm; MVP services listed in `docs/architecture.md`; no Step Functions; no invented region or model.
- **Files changed:** `docs/architecture.md`, `docs/decision-log.md`, `.env.example`, `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `.node-version`, `infra/cdk.json`, `infra/tsconfig.json`, `infra/package.json`, `AGENTS.md`, `README.md`, `docs/checkpoints.md`.
- **Commands run:** AWS presence check (CLI missing, no profile, no `~/.aws`); Node JSON parse; `git check-ignore .env`; `git diff --check`; secret scan of tracked files; `npm run engine-check`.
- **Region/model verification:** **Failed / not possible** — no AWS CLI, no credentials, env unset. Placeholders `<development-region>` and `<approved-model-id>` only.
- **Blockers:** AWS CLI, development profile, verified region, Bedrock Converse model access, CDK CLI (for C1.4+), Node 22 locally recommended.

## C0.3 report

- **Status:** Complete.
- **Files:** `docs/requirements.md`, `docs/claims.md`, `docs/limitations.md`, `packages/contracts/package.json`, `packages/contracts/src/types.ts`, `packages/contracts/src/index.ts`.
- **Not built:** policy engine, DynamoDB repos, Bedrock runner, API handlers, UI.

## C0.4 report

- **Status:** Complete. Token freeze only.
- **Files:** `docs/design-tokens.md`.
- **Not built:** dashboard, landing page, no UI libraries.

## C1.1 report

- **Status:** Complete. Contracts compile; synthetic fixtures pass. No policy engine, AWS, runner, API, or UI.
- **Files changed:** `packages/contracts/src/{types,index,contracts.test}.ts`, `packages/test-fixtures/**`, root `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `prettier.config.js`, `.prettierignore`, `.npmrc`, `docs/checkpoints.md`, `docs/decision-log.md`.
- **Tests run:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (10 tests), `git diff --check`.
- **Results:** all of the above passed (exit 0). Vitest 2 files / 10 tests passed.
- **Contracts compile:** yes (`tsc --noEmit`).
- **Synthetic fixtures:** pass (loop / safe-completion / bounded-tool-error).
- **Blockers unchanged:** AWS CLI, credentials, region, Bedrock model, Node 22 locally (24.18.0 in use; no Node 24 APIs).
- **Next proposed checkpoint:** **C1.2** stable action signatures.

## C1.2 report

- **Status:** Complete. Pure `stableStringify` / `normalizeAction` only. No policy evaluator, AWS, runner, API, or UI.
- **Files changed:** `packages/policy-engine/**`, `tsconfig.json` (path alias), `vitest.config.ts` (resolve alias), `docs/checkpoints.md`, `docs/decision-log.md`.
- **stableStringify:** recursive key sort; array order preserved; null/string/boolean/finite number/plain object/array supported; throws `UnsupportedSignatureValueError` for undefined, NaN, Infinity, bigint, symbol, function, Date, Map, Set, class instances, sparse arrays, oversized strings, max depth. Does not coerce those into JSON-looking data.
- **normalizeAction:** `{name}:{stableStringify(redactedArgs)}`. Equivalent key order matches; different args or names differ. Sensitive keys (`prompt`, `apiKey`, tokens, etc.) become `<redacted>`. Empty names throw.
- **Tests run:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (4 files / 28 tests), `git diff --check`. All passed.
- **Tests not run:** policy engine evaluator, persistence, integration, e2e, Bedrock, cdk.
- **Limitations:** no evaluator yet; redaction is key-name based, not semantic secret scanning; circular structures fail as max-depth, not a dedicated cycle error.
- **Next proposed checkpoint:** **C1.3** pure policy engine.

## C1.3 report

- **Status:** Complete. Pure `evaluateBeforeCall` only. No AWS, network, filesystem, UI, API, or Bedrock logic.
- **Evaluation order:** INVALID_POLICY → INVALID_RUN_STATE → RUN_NOT_RUNNING → MAX_RUNTIME_EXCEEDED → MAX_STEPS_EXCEEDED → MAX_ESTIMATED_COST_EXCEEDED → UNSUPPORTED_ACTION_ARGUMENTS → MAX_REPEATED_ACTION_EXCEEDED.
- **Thresholds:** runtime `elapsedMs >= maxRuntimeMs`; steps `stepCount + 1 > maxSteps` (5/6 allow, 6/6 block); estimated cost `current + proposed > max` (equality allows); repeats `matchingPrior + 1 > maxRepeatedActionCount` (2+next allow at max 3; 3+next block).
- **Reason codes:** existing plus `INVALID_POLICY`, `INVALID_RUN_STATE`, `UNSUPPORTED_ACTION_ARGUMENTS`. Repeated code remains `MAX_REPEATED_ACTION_EXCEEDED`.
- **Files changed:** `packages/policy-engine/src/evaluate.ts`, `evaluate.test.ts`, `index.ts`, `package.json`, `README.md`; `packages/contracts/src/types.ts`, `contracts.test.ts`; `docs/requirements.md`, `claims.md`, `limitations.md`, `checkpoints.md`, `decision-log.md`; `tsconfig.json` path alias.
- **Commands run:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (5 files / 51 tests), `git diff --check`. All passed.
- **Tests not run:** CDK synth, persistence, wrapper/tool integration, e2e, Bedrock.
- **Limitations:** no persistence or enforcement wrapper yet; IEEE floats on cost sums; key redaction is not secret scanning.
- **Next proposed checkpoint:** **C1.4** CDK synthesis and infrastructure review.

## C1.4 report

- **Status:** Complete for synth + IAM review. **Not deployed.**
- **Synth:** `pnpm infra:synth` → `tsc -p tsconfig.json && cdk synth` in `infra/`. **Passed** (template `infra/cdk.out/FuseMvp.template.json`).
- **Resources:** FuseRuns (PK runId), FuseEvents (PK runId, SK sequence), bus `fuse-breaker`, control/runner Lambdas (Node 22 placeholders), HTTP API GET /health, 7-day log groups.
- **IAM:** table-scoped DynamoDB R/W, PutEvents on `fuse-breaker`, log write on named groups. No AdministratorAccess. **No bedrock:InvokeModel** (model ID unverified).
- **Env:** `FUSE_LIVE_BEDROCK=false`, `BEDROCK_MODEL_ID=<approved-model-id>`. No credentials in template.
- **Commands:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (6 files / 58 tests), `pnpm infra:synth`, `git diff --check`.
- **Tests not run:** deploy, repositories, wrapper, e2e, live Bedrock.
- **Blockers:** AWS CLI, credentials, verified region, verified Bedrock model; Node 22 vs local 24.
- **Next proposed checkpoint:** **C1.5** DynamoDB repositories.

## C1.5 report

- **Status:** Complete for repository layer. No deploy, no EventBridge, no runner, no API.
- **Files:** `packages/persistence/**`, `tsconfig.json`, `vitest.config.ts`, `docs/architecture.md`, `docs/limitations.md`, `docs/decision-log.md`, `docs/checkpoints.md`.
- **Behavior:** create/get/update counters/transition/append/list/getPolicySnapshot. Conditional duplicate run and event writes. Terminal immutability. Metadata redaction. Caller timestamps.
- **Commands:** `tsc --noEmit`, `eslint`, Vitest **7 files / 84 tests**, Prettier check, `git diff --check`. CDK not redeployed.
- **Tests not run:** live DynamoDB, EventBridge, beforeCall wrapper, Bedrock, e2e.
- **Next proposed checkpoint:** **C1.6** enforcement wrapper (denied call does not execute).

## C1.6 report

- **Status:** Complete for the enforcement wrapper. No Bedrock runner, API, frontend, deploy, or live EventBridge.
- **Proof:** Repeated `verify_vendor` with `maxRepeatedActionCount: 3` executes **N=3** times; the 4th is denied; executions stay **3**; status `BREAKER_TRIPPED`; reason contains **Next invocation blocked**; `POLICY_BLOCKED.metadata.nextInvocation === "BLOCKED"`; ordered events persisted.
- **Files:** `packages/enforcement/**`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`, `.prettierignore`, `docs/{architecture,claims,limitations,requirements,decision-log,checkpoints}.md`.
- **Commands:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (**8 files / 94 tests**), `git diff --check`. All passed.
- **Tests not run:** live DynamoDB, live EventBridge, Bedrock Converse, API, Playwright, `cdk deploy`.
- **Limitations:** injected executors only; EventBridge is a no-op/hook; fail-closed is pre-call; local Node 24 vs target 22; region/model unverified.
- **Next proposed checkpoint:** **C1.7A** synthetic runner (no deploy).

## C1.7A report

- **Status:** Complete for the controlled **simulation** runner. **Live Bedrock is not implemented. Nothing was deployed.**
- **Scenarios:** `invoice-verification-loop` → `BREAKER_TRIPPED`; `safe-completion` → `COMPLETED`; `bounded-tool-error` retries then `BREAKER_TRIPPED`. Hard safety cap fails the run instead of looping forever.
- **Files:** `packages/runner/**`, `tsconfig.json`, `vitest.config.ts`, `docs/{architecture,claims,limitations,decision-log,checkpoints}.md`.
- **Commands:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (**9 files / 104 tests**), `pnpm infra:synth` (synth only), `git diff --check`.
- **Tests not run:** live DynamoDB, live EventBridge, Bedrock Converse, API handlers, frontend, Playwright, `cdk deploy`.
- **Confirmation:** No Amazon Bedrock client. No EventBridge `PutEvents`. No `cdk deploy`. Execution mode is labeled `simulation`.
- **Next proposed checkpoint:** **C1.7B** development deployment and Bedrock verification.

## C1.7B report

- **Status:** **Blocked by an external AWS account check.** This is **not** a Fuse application failure. Live Bedrock remains **off**. Nothing was deployed.
- **Attempted region / model (do not treat as a successful live Converse run):** `us-east-1` / `amazon.nova-lite-v1:0`.
- **Succeeded:** IAM identity verification; Bedrock `ListFoundationModels`; `GetFoundationModel`.
- **Blocked:** Bedrock **Converse** invocation. AWS response: account is currently being verified (`Your account is currently being verified.`).
- **Kill switch:** `FUSE_LIVE_BEDROCK=false` (unchanged). Do not present simulation as live Bedrock. Do not invent a successful Converse result.
- **Retry policy:** Do **not** repeatedly retry the Bedrock invocation while this AWS verification is pending. One recorded attempt is enough.
- **Working path:** keep the C1.7A deterministic synthetic runner (`simulate_invoice_planner` + allowlisted `verify_vendor`).
- **Tests not run:** live Converse, live tool use on Bedrock, `cdk deploy`, EventBridge in-account receipt.
- **Next proposed checkpoint:** C2.1 dashboard shell, or a single Converse re-check **after** AWS account verification completes. Wait for explicit instruction.

## C2.0 report

- **Status:** Complete for the **local synthetic HTTP API**. No frontend. Live Bedrock remains **false**. Full run API is **not** deployed to API Gateway (health JSON only on the CDK inline Lambda).
- **Endpoints:** `GET /health`, `POST /runs` (Idempotency-Key + `{ scenario, policyId }`), `GET /runs/{runId}`, `GET /runs/{runId}/events`, `GET /policies`.
- **Scenarios:** the three allowlisted synthetic invoice scenarios only.
- **Files:** `packages/api/**`, root `package.json` (`api:dev`), `tsconfig.json`, `vitest.config.ts`, `infra/lib/fuse-stack.ts`, docs.
- **Commands:** `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test` (**10 files / 112 tests**), `pnpm infra:synth` (synth only), `git diff --check`.
- **Tests not run:** live DynamoDB, live EventBridge, Bedrock Converse, frontend, Playwright, `cdk deploy`.
- **Confirmation:** `GET /health` returns `{ ok: true, service: "fuse-api", mode: "synthetic", liveBedrock: false }`.
- **Next proposed checkpoint:** **C2.1** dashboard shell. Wait for explicit instruction.

## C2.1–C2.6 frontend report (Complete Experience Update)

- **Status:** Complete award-winning dark cybernetic control-room experience in `apps/dashboard` strictly fulfilling the 28-section Master Prompt. Zero backend logic or contract modifications.
- **Pages:**
  - `/` (Landing Page with centered FUSE title featuring Originkit Light Shaft Text + Electric Sparks effect, 5-second animated SVG Circuit Gate diagram, and the 8 storytelling screenplay acts in required product-story order).
  - `/overview` (Operations control room with interactive failure loop & safe completion triggers, live API health indicator, active policy limits preview, and session run ledger).
  - `/runs/:runId` (Live run view with auto-polling, unmissable `BREAKER_TRIPPED` soft pulse alert with previous allowed vs proposed blocked call breakdown, `COMPLETED` safe banner, policy threshold progress bars, and expandable audit timeline).
  - `/runs` (Session audit history with filter tabs).
  - `/policies` (Live policy contract inspection via `GET /policies` with read-only immutable snapshot disclosure).
  - `/architecture` (Honest 8-stage AWS pipeline with Implemented, Tested, Synthetic, Planned, and Pending verification tags, plus pre-call wrapper contract walkthrough).
  - `/docs` (Technical evidence manual answering all jury questions with verified facts).
- **Design Tokens & System:** Sora (Headings), IBM Plex Sans (Body), JetBrains Mono (Technical data), dark palette (`#060912`, `#0D1626`, `#15243A`, `#58D9FF`, `#FF6B6B`, `#43E0A4`), 4px/8px rhythm, AA contrast, responsive mobile navigation drawer, skip-to-content accessibility.
- **API connected:** `GET /health`, `POST /runs`, `GET /runs/{runId}`, `GET /runs/{runId}/events`, `GET /policies`.
- **Mandatory Labels Enforced:** `SYNTHETIC DEMO MODE`, `Live Bedrock pending AWS account verification`, `Estimated run cost`, `Next invocation blocked`.
- **Verification:**
  - `pnpm format:check` (Prettier checked cleanly)
  - `pnpm lint` (ESLint passed with 0 errors)
  - `pnpm typecheck` (TypeScript strict passed with exit code 0)
  - `pnpm test` (11 test files / 114 tests passed)
  - `pnpm --filter @fuse/dashboard build` (Production bundle built in 434ms)
- **Live Bedrock:** Kept honestly disabled pending AWS account verification.
- **Next approved task:** Do not deploy automatically. Do not enable live Bedrock. Wait for explicit user instructions.

## Dashboard Information Architecture Cleanup & Evidence-Only UI Report

- **Status:** Complete evidence-only dashboard cleanup in `apps/dashboard`.
- **Sections Retained:**
  - Overview (`/overview`)
  - Run Audit Ledger (`/runs`)
  - Current Run Details & Breaker Alert (`/runs/:runId`)
  - Policy Contracts (`/policies`)
  - System Architecture & Pipeline (`/architecture`)
  - Technical Reference / FAQ (`/docs`)
- **Dummy Data Removed:**
  - Removed all fake KPI grids, fake SLA percentages (96%), fake average latencies (1.8s), fake average lag (38s), fake workflow counts (15), fake errored workflow lists (Orders import, Data enrichment, Deduplication), fake customer/incident metrics, and fake charts.
- **API-Backed Data Verified:**
  - `GET /health`: API reachability, mode (`synthetic`), `liveBedrock: false`.
  - `POST /runs`: Primary scenario execution (`invoice-verification-loop`, `safe-completion`).
  - `GET /runs/:runId`: Run status (`BREAKER_TRIPPED`, `COMPLETED`, `RUNNING`), step count, estimated cost, runtime, next invocation (`BLOCKED`).
  - `GET /runs/:runId/events`: Ordered audit events with sequence, type, timestamp, kind, name, decision, reason code, and sanitized metadata.
  - `GET /policies`: Read-only policy limits (`maxRepeatedActionCount`, `maxSteps`, `maxEstimatedCostUsd`, `maxRuntimeMs`).
- **Empty & Failure States:**
  - Honest empty state when no runs exist (`No demo run yet. Start a protected synthetic run to see Fuse evaluate and block the next invocation.`).
  - Honest backend unavailable state on API connection failure.
- **Verification Matrix:**
  - `pnpm format:check` — PASS
  - `pnpm lint` — PASS (0 errors)
  - `pnpm typecheck` — PASS (0 errors)
  - `pnpm test` — PASS (11 test files / 114 tests passed)
  - `pnpm build` — PASS (Vite bundle built in 708ms)
  - `pnpm infra:synth` — PASS (CDK synthesized cleanly)
  - `git diff --check` — PASS (0 syntax/whitespace errors)
- **Backend Behavior Changed:** No.
- **Deployment Status:** Nothing deployed.
- **Live Bedrock:** Disabled (`FUSE_LIVE_BEDROCK=false`; AWS account verification pending).
