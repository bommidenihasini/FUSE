# Fuse leftover landing stub

This folder is a small landing page from early pairing. The product UI is `apps/dashboard`.

## Why the old alert appeared

`Start failure simulation` used to call `alert("The Fuse simulation will be connected later.")`. It now starts the allowlisted `invoice-verification-loop` scenario against the local synthetic API.

## Run

From the **repo root**:

```bash
pnpm api:dev
```

In a second terminal:

```bash
cd dashboard
pnpm install
pnpm dev
```

Open http://localhost:5173/

For the full control room (timeline, policies, safe completion):

```bash
pnpm api:dev
pnpm ui:dev
```
