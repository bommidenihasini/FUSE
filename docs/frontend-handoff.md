# Frontend handoff

Product UI lives in `apps/dashboard`. The teammate Vite stub in `/dashboard` is unused.

## Run locally

Terminal 1:

```bash
pnpm api:dev
```

Terminal 2:

```bash
pnpm ui:dev
```

Open http://localhost:5173/

Vite proxies `/health`, `/runs`, and `/policies` to `http://127.0.0.1:8787`.

Optional: `apps/dashboard/.env` with `VITE_FUSE_API_URL=http://127.0.0.1:8787` for production-style absolute URLs.

## Connected endpoints

- `GET /health`
- `POST /runs` with `Idempotency-Key` and `{ scenario, policyId }`
- `GET /runs/{runId}`
- `GET /runs/{runId}/events`
- `GET /policies`

Scenarios: `invoice-verification-loop`, `safe-completion`, `bounded-tool-error`.
Default start policy: `policy-demo-strict`.

## Demo sequence

1. Home → **Run the protected demo**.
2. Overview → **Start Invoice Loop**.
3. Confirm **BREAKER TRIPPED** and **Next invocation blocked**.
4. Expand audit events.
5. Overview → **Run Safe Completion**.
6. Confirm **RUN COMPLETED SAFELY**.

Recent runs are stored in `sessionStorage` only (no list-runs API).

## Mock mode

None. Failed API calls show **Backend unavailable**.

## Build

```bash
pnpm build
```

## Live Bedrock

Off. Copy always says Live Bedrock pending AWS account verification.

## Deployment

Not started. Do not treat this UI as Amplify-hosted until a later checkpoint.
