# Fuse — AWS Synthetic Deployment Readiness Report

Date: 2026-09-19
Environment: AWS Synthetic Deployment Readiness
Profile: `fuse-dev`
Target Region: `us-east-1`
Operator: Antigravity AI Assistant

---

## Executive Summary

- **Synthetic Deployment Readiness**: `READY`
- **AWS Identity Check**: PASS (`arn:aws:iam::843447460827:user/fuse-dev`, Account `843447460827`)
- **AWS Region**: PASS (`us-east-1`)
- **Deployment Permissions**: PASS (Scoped stack creation permissions for DynamoDB, Lambda, API Gateway, EventBridge, CloudWatch, IAM PassRole)
- **Configuration Audit**: PASS
- **Local Verification Suite**: PASS (11 test files passed, 114 tests passed, 0 lint errors, 0 type errors, Prettier clean, CDK synth clean)
- **CDK Synth Result**: PASS (`FuseMvp` CloudFormation template synthesized cleanly)
- **IAM Security Review**: PASS (Least privilege execution roles; zero `AdministratorAccess`; zero `IAMFullAccess`; Bedrock invocation permission omitted until model access is verified)
- **Live Bedrock Status**: Disabled (`FUSE_LIVE_BEDROCK=false`; AWS account verification pending)
- **Session Ledger Limitation**: Local `sessionStorage` only (no `GET /runs` list endpoint)
- **Policy Contract Limitation**: Read-only policies (no `POST /policies` or `PATCH /policies` endpoints)

---

## 1. AWS Identity & Region Verification

| Metric | Configured Value | Verified State |
| :--- | :--- | :--- |
| **IAM User ARN** | `arn:aws:iam::843447460827:user/fuse-dev` | PASS (`aws sts get-caller-identity`) |
| **Account ID** | `843447460827` | PASS |
| **Configured Region** | `us-east-1` | PASS (`aws configure get region`) |
| **AWS Profile** | `fuse-dev` | PASS |

---

## 2. Infrastructure Resource Inventory (`infra/lib/fuse-stack.ts`)

| Resource Type | Resource Logical ID / Name | Configuration Details |
| :--- | :--- | :--- |
| **DynamoDB Table** | `FuseRuns` | Partition Key: `runId` (String), Pay-per-request, PITR enabled |
| **DynamoDB Table** | `FuseEvents` | Partition Key: `runId` (String), Sort Key: `sequence` (Number), Pay-per-request, PITR enabled |
| **EventBridge Bus** | `fuse-breaker` | Custom event bus for `BreakerTripped` notices |
| **CloudWatch LogGroup** | `FuseControlLogs` | 7-day retention, dev `RemovalPolicy.DESTROY` |
| **CloudWatch LogGroup** | `FuseRunnerLogs` | 7-day retention, dev `RemovalPolicy.DESTROY` |
| **Lambda Function** | `FuseControlFn` | Node.js 22.x, 10s timeout, synthetic control endpoint |
| **Lambda Function** | `FuseRunnerFn` | Node.js 22.x, 30s timeout, synthetic runner |
| **HTTP API Gateway** | `FuseHttpApi` | HTTP API v2 with route `GET /health` |

---

## 3. IAM & Security Audit

- **Least Privilege Execution Roles**: `FuseControlRole` and `FuseRunnerRole` grant scoped write permissions to their respective CloudWatch log groups, DynamoDB tables (`FuseRuns`, `FuseEvents`), and `fuse-breaker` EventBridge bus.
- **Zero Wildcards**: Zero `AdministratorAccess`, zero `IAMFullAccess`, zero `Action: "*"` wildcards.
- **Bedrock Scoping**: `bedrock:InvokeModel` permissions are **omitted** until human verification of Bedrock Converse model access is completed.
- **Credential Safety**: No AWS access keys, secret keys, or session tokens exist in source code. `.env` and `.env.*` are ignored in `.gitignore`. `.env.example` contains placeholders only.

---

## 4. Local Verification Matrix

| Verification Command | Execution Status | Result |
| :--- | :--- | :--- |
| `pnpm format:check` | Exit code 0 | All matched files use Prettier style |
| `pnpm lint` | Exit code 0 | 0 ESLint errors across all packages |
| `pnpm typecheck` | Exit code 0 | 0 TypeScript compilation errors |
| `pnpm test` | Exit code 0 | 11 test files passed (114 tests passed) |
| `pnpm build` | Exit code 0 | Vite production client built in 790ms |
| `pnpm infra:synth` | Exit code 0 | Stack `FuseMvp` synthesized cleanly |
| `git diff --check` | Exit code 0 | 0 whitespace or syntax conflicts |

---

## 5. Verified Limitations

1. **Live Bedrock Converse**: Kept disabled (`FUSE_LIVE_BEDROCK=false`) pending AWS account verification (`Your account is currently being verified.`).
2. **Session-Only Run Ledger**: Runs are tracked locally in browser `sessionStorage`. No backend list-runs endpoint exists.
3. **Read-Only Policy Contracts**: Policies are immutable snapshots. Mutation endpoints (`POST /policies`, `PATCH /policies`) are intentionally not implemented for public synthetic safety.
4. **Synthetic Execution**: Demo scenarios (`invoice-verification-loop`, `safe-completion`, `bounded-tool-error`) run through the verified synthetic policy wrapper and runner.

---

## 6. Expected AWS Costs & Cleanup Guidance

- **DynamoDB**: On-Demand billing (`PAY_PER_REQUEST`), zero cost when idle.
- **Lambda / API Gateway**: Free Tier eligible; minimal synthetic invocation volume.
- **CloudWatch Logs**: 7-day retention cap prevents log accumulation cost.
- **Teardown Command**:
  ```bash
  cdk destroy --profile fuse-dev
  ```

---

## 7. Deployment Command & Explicit Approval Gate

### Deployment Command
```bash
cdk deploy --profile fuse-dev
```

### Explicit Approval Gate
```text
Deployment command has not been run.
Explicit human approval is required before running cdk deploy.
```
