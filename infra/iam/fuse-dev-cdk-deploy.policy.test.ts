import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const dir = path.dirname(fileURLToPath(import.meta.url));

const policyFiles = [
  "FuseDevCdkCloudFormation.json",
  "FuseDevCdkServices.json",
  "FuseDevCdkIamPassRole.json",
  "FuseDevCdkBootstrapAssets.json",
];

describe("fuse-dev CDK deploy split IAM policies", () => {
  const policies = policyFiles.map((file) => {
    const raw = readFileSync(path.join(dir, file), "utf8");
    const parsed = JSON.parse(raw) as {
      Statement: Array<{
        Sid?: string;
        Effect: string;
        Action: string | string[];
        Resource?: unknown;
      }>;
    };
    const nonWs = raw.replace(/\s+/g, "").length;
    return { file, raw, parsed, nonWs };
  });

  test("all policy files are under 6,144 non-whitespace characters", () => {
    for (const item of policies) {
      expect(item.nonWs).toBeLessThan(6144);
    }
  });

  test("no policy contains AdministratorAccess or IAMFullAccess", () => {
    for (const item of policies) {
      expect(item.raw).not.toContain("AdministratorAccess");
      expect(item.raw).not.toContain("IAMFullAccess");
    }
  });

  test("CloudFormation policy explicitly denies Bedrock invocation", () => {
    const cfPolicy = policies.find((p) => p.file === "FuseDevCdkCloudFormation.json")?.parsed;
    expect(cfPolicy).toBeDefined();
    const deny = cfPolicy?.Statement.find((s) => s.Sid === "DenyBedrockInvocation");
    expect(deny?.Effect).toBe("Deny");
    const denied = Array.isArray(deny?.Action) ? deny.Action : [deny?.Action];
    expect(denied).toEqual(
      expect.arrayContaining([
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:Converse",
        "bedrock:ConverseStream",
      ]),
    );
  });

  test("no policy allows Bedrock invocation", () => {
    for (const item of policies) {
      const allowsBedrock = item.parsed.Statement.some((statement) => {
        if (statement.Effect !== "Allow") {
          return false;
        }
        const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
        return actions.some((action) => action.startsWith("bedrock:"));
      });
      expect(allowsBedrock).toBe(false);
    }
  });

  test("IamPassRole policy scopes iam:PassRole to FuseMvp and CDK bootstrap roles", () => {
    const passPolicy = policies.find((p) => p.file === "FuseDevCdkIamPassRole.json")?.parsed;
    expect(passPolicy).toBeDefined();
    const pass = passPolicy?.Statement.find((s) => s.Sid === "PassOnlyFuseAndCdkRoles");
    expect(pass?.Effect).toBe("Allow");
    expect(pass?.Action).toBe("iam:PassRole");
    expect(pass?.Resource).toEqual([
      "arn:aws:iam::843447460827:role/FuseMvp-*",
      "arn:aws:iam::843447460827:role/cdk-hnb659fds-*",
    ]);
  });
});
