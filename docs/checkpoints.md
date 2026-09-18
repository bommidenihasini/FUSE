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
| C1.6 | Day 1 + 8:00 | Denied call does not execute | Pending |
| C1.7 | Day 1 + 9:00 | Development deployment checked | Pending |
| C2.1 | Day 2 + 1:30 | Dashboard shell loads | Pending |
| C2.2 | Day 2 + 3:30 | Live run uses backend state | Pending |
| C2.3 | Day 2 + 5:00 | Polling failures visible | Pending |
| C2.4 | Day 2 + 6:30 | Policy edit changes behavior | Pending |
| C2.5 | Day 2 + 8:00 | Replay is immutable | Pending |
| C2.6 | Day 2 + 9:30 | Non-builder understands breaker | Pending |
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

**Next approved task:** C1.6 — `beforeCall` wrapper proving a denied tool is never invoked. Wait for explicit instruction.
