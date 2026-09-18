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
- Region and model ID are **unverified** as of C0.2; live mode stays off until a human completes the architecture.md verification procedure.

## Infrastructure (C1.4)

- The CDK stack has been **synthesized**, not **deployed**. No live AWS resources were created in C1.4.
- `RemovalPolicy.DESTROY` is development-only and must not be treated as a production deletion policy.
- Bedrock invoke IAM is **omitted** until a verified `BEDROCK_MODEL_ID` exists. Fuse does not use `Resource: "*"` for Bedrock as a workaround.
- Placeholder Lambdas are not a working control plane or runner.

## Persistence (C1.5)

- Repositories are tested against an in-memory store and a fake DynamoDB document client. They have **not** been run against a deployed table.
- Terminal runs are immutable at the repository layer. Replay must create a new run (later checkpoint).
- Event metadata redaction is key-name based, not secret scanning.
