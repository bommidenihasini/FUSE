# `@fuse/runner`

Controlled **simulation** runner for the three allowlisted invoice-verification scenarios. Every model and tool step goes through `Fuse.beforeCall` / `afterCall`. Denied calls are not executed.

This package does **not** call Amazon Bedrock, EventBridge, arbitrary URLs, or tools. It does not deploy anything.

Hard safety cap: at most `HARD_RUNNER_SAFETY_CAP` loop iterations, even if policy limits are raised.
