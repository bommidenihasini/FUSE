# `@fuse/api`

Minimal HTTP API over the C1.7A **synthetic** runner. `liveBedrock` is always `false`. There is no frontend in this package.

## Endpoints

- `GET /health`
- `POST /runs` — `Idempotency-Key` required; body `{ scenario, policyId }`
- `GET /runs/{runId}`
- `GET /runs/{runId}/events`
- `GET /policies`

Allowlisted scenarios only: `invoice-verification-loop`, `safe-completion`, `bounded-tool-error`.

Local listen: `pnpm api:dev` (`FUSE_API_PORT`, default 8787). This is not a live Bedrock service and is not a deployed API Gateway.
