# Day 0 inventory

Inspected `D:\FUSE` before and after C0.1 bootstrap. **AGENTS.md was read in full** (mission, scope, contracts, policy order, public limits, agent protocol, definition of done).

## Current repository state

- Git: initialized empty repository at `D:/FUSE/.git/`
- Application code: none
- Package manifests: none
- Dependencies: none
- Infrastructure templates: none
- `.env`: not created (correct; ignored)
- `.env.example`: present, placeholders only

## Files present after C0.1

- `AGENTS.md`
- `README.md`
- `.gitignore`
- `.env.example`
- `.cursor/rules/00-project.mdc`
- `.cursor/rules/10-architecture.mdc`
- `.cursor/rules/20-security.mdc`
- `.cursor/rules/30-ui.mdc`
- `.cursor/rules/40-testing.mdc`
- `.cursor/rules/50-demo.mdc`
- `docs/checkpoints.md`
- `docs/day0-inventory.md`
- `docs/decision-log.md`
- Empty package folders: `apps/dashboard`, `apps/api`, `apps/runner`, `packages/contracts`, `packages/policy-engine`, `packages/pricing`, `packages/test-fixtures`, `infra`, `tests`

## Missing Fuse requirements (intentionally later)

- `docs/requirements.md`, `docs/architecture.md`, `docs/claims.md`, `docs/limitations.md`, `docs/demo-script.md` (C0.2–C0.3)
- Typed contracts and fixtures (C1.1)
- Policy engine (C1.3)
- CDK/SAM stack (C1.4)
- Runner, API, dashboard, landing page (Day 1–3)
- Tests, CI, Amplify hosting

## Selected package manager

**pnpm** (v11.7.0). npm 11.16.0 is also present. Do not mix.

## Selected infrastructure tool

**AWS CDK (TypeScript), not SAM.** Approved at C0.2. Region and model still unverified.

## Runtime

| Tool | Status |
| --- | --- |
| Node | v24.18.0 installed; playbook asks for Node 22 |
| pnpm | 11.7.0 |
| AWS CLI | **missing** |
| AWS CDK CLI | **missing** |
| SAM CLI | missing (acceptable if CDK is chosen) |
| Bedrock model access | **unknown** — needs AWS account + model enablement |

## Required commands (to add later, not now)

```
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm build
pnpm infra:synth
pnpm infra:deploy
pnpm infra:destroy
```

## Risks and blockers

1. No AWS CLI and no confirmed development AWS account/role.
2. Bedrock Converse model ID and region are not chosen; live path cannot be verified yet.
3. Node 22 vs local Node 24 mismatch.
4. Public demo must stay on synthetic tools even after AWS is wired.
5. Spending alarm is not set (human/account action).

## Proposed Day 1 plan (do not start until C0.2–C0.4 are approved)

After stack freeze and contracts: typed Policy/Run/Event contracts and fixtures → stable stringify tests → pure policy engine → CDK synth (no admin IAM) → DynamoDB repositories → `beforeCall` wrapper proving denied tools never execute → optional deploy only if credentials exist.

## Stop

C0.1 complete. No application code. Waiting for explicit continue before C0.2 (stack and model freeze).
