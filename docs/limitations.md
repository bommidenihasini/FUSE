# Limitations (what Fuse must not claim)

Fuse is a hackathon prototype for **one integrated workflow**.

## Enforcement boundary

- Fuse does **not** intercept every agent on the internet or every Bedrock call in the account.
- Fuse does **not** cancel **every already-running** HTTP, Lambda, or Bedrock request. It **blocks the next integrated invocation** after `beforeCall` denies.
- Fuse does **not** work with every framework (LangChain, CrewAI, OpenAI, coding agents) in this MVP.

## Cost and monitoring

- Estimated cost is **versioned pricing in code**, not AWS Cost Explorer or the invoice.
- CloudWatch, Bedrock invocation logs, and billing reports remain AWS’s systems. Fuse does not replace them.

## Policy engine (C1.3)

- The evaluator is **pure**. It does not call AWS, Bedrock, DynamoDB, EventBridge, or the system clock.
- It blocks the **next** integrated invocation. It does **not** cancel a call that already started.
- Cost is **estimated** and must be provided by the caller. The engine does not inspect AWS pricing.
- Repeated-action detection uses normalized signatures. Key-based redaction is **not** full secret scanning.
- Unsupported arguments are denied with `UNSUPPORTED_ACTION_ARGUMENTS`, not coerced into a fake signature.
- Loop detection is **normalized action equality**, not semantic embeddings.
- Different arguments are **not** duplicates. Key order must not create false duplicates.

## Data and public demo

- No real invoices, payments, vendors, customers, or personal data.
- No arbitrary prompts, URLs, tool definitions, or code execution in public mode.
- Strict limits: one concurrent run per session, 30s, eight steps, rate limiting, Bedrock kill switch.

## Operations

- If DynamoDB audit writes fail: **fail closed**.
- If EventBridge publish fails: audit should still remain; show a warning (not fake success).
- If Bedrock is down: honest error + simulation option.
- **C1.7B external AWS blocker (not a Fuse bug):** IAM identity, Bedrock model listing, and `GetFoundationModel` succeeded in `us-east-1` for `amazon.nova-lite-v1:0`. **Converse** was refused because the AWS account is still being verified (`Your account is currently being verified.`). Keep `FUSE_LIVE_BEDROCK=false`. Keep the synthetic runner. Do not invent a successful live Bedrock run. Do not retry Converse in a loop while verification is pending.

## Infrastructure (C1.4)

- The CDK stack has been **synthesized**, not **deployed**. No live AWS resources were created in C1.4.
- `RemovalPolicy.DESTROY` is development-only and must not be treated as a production deletion policy.
- Bedrock invoke IAM is **omitted** until a verified `BEDROCK_MODEL_ID` exists. Fuse does not use `Resource: "*"` for Bedrock as a workaround.
- Placeholder Lambdas are not a working control plane or runner.

## Persistence (C1.5)

- Repositories are tested against an in-memory store and a fake DynamoDB document client. They have **not** been run against a deployed table.
- Terminal runs are immutable at the repository layer. Replay must create a new run (later checkpoint).
- Event metadata redaction is key-name based, not secret scanning.

## Enforcement wrapper (C1.6)

- The wrapper does **not** call Amazon Bedrock. Tests inject fake model/tool functions.
- The wrapper does **not** publish live EventBridge events. An optional hook may record a `BreakerTripped` notice; a hook failure must not unwind a persisted trip.
- Fail closed applies to policy evaluation and required audit writes **before** the underlying call. A failure in `afterCall` cannot un-execute a call that already ran.
- Fuse still does **not** cancel in-flight work outside this wrapper.

## Synthetic runner (C1.7A)

- The runner does **not** call Amazon Bedrock. The model step is `simulate_invoice_planner`.
- The runner does **not** publish EventBridge events, expose HTTP APIs, or deploy AWS resources.
- Only `verify_vendor` is allowlisted. No arbitrary URLs or tools.
- A hard iteration cap (`HARD_RUNNER_SAFETY_CAP`) stops unbounded loops even if policy limits are raised.

## Bedrock verification (C1.7B)

- Live Bedrock Converse is **not** available yet. The blocker is AWS account verification, not Fuse policy, the runner, or a missing model ID in application code.
- `FUSE_LIVE_BEDROCK` stays **false**. Simulation must remain labeled simulation.
- Listing a foundation model is **not** the same as a successful Converse + tool-use invocation. Fuse must not claim a live Bedrock run from C1.7B.

## HTTP API (C2.0) and AWS deploy

- Local `@fuse/api` still uses an in-memory store. The CDK stack deploys the same HTTP surface on API Gateway + Lambda with DynamoDB and EventBridge. `liveBedrock` remains **false**.
- The public dashboard is served from CloudFront in front of a private S3 bucket (same-origin `/health`, `/runs`, `/policies`). This is not Amplify Hosting; Amplify would need a GitHub token we do not store in the repo.
- Reset, replay, and policy mutation endpoints are not implemented.
- Live Bedrock Converse is still blocked by AWS account verification. The placeholder runner Lambda returns 501 and has no `bedrock:InvokeModel`.

## Frontend (C2.1–C2.6)

- `apps/dashboard` is the product UI. It talks only to the synthetic local API. It does not call Bedrock and does not embed AWS credentials.
- Recent runs are **sessionStorage**, not a list-runs API.
- Policy editing and replay are not in the UI.
