const { checkPolicy } = require("../../packages/policy-engine/policy");

for (let attempt = 1; attempt <= 4; attempt++) {
  const result = checkPolicy(attempt);

  console.log(
    `Attempt ${attempt} → ${result.allowed ? "allowed" : "blocked"}`
  );
}
