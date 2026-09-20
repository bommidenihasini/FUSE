import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, test } from "vitest";
import { FuseStack, PLACEHOLDER_BEDROCK_MODEL_ID } from "./fuse-stack.js";

function synthTemplate(): Template {
  const app = new App({ context: { "fuse:skipDashboard": true } });
  const stack = new FuseStack(app, "FuseMvpTest");
  return Template.fromStack(stack);
}

describe("FuseStack", () => {
  let template: Template;

  beforeAll(() => {
    template = synthTemplate();
  }, 120_000);

  test("defines two DynamoDB tables with the required keys", () => {
    template.resourceCountIs("AWS::DynamoDB::Table", 2);
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [{ AttributeName: "runId", KeyType: "HASH" }],
    });
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [
        { AttributeName: "runId", KeyType: "HASH" },
        { AttributeName: "sequence", KeyType: "RANGE" },
      ],
    });
  });

  test("defines the Fuse EventBridge bus", () => {
    template.hasResourceProperties("AWS::Events::EventBus", {
      Name: "fuse-breaker",
    });
  });

  test("does not create an administrator IAM policy", () => {
    const json = JSON.stringify(template.toJSON());
    expect(json).not.toContain("AdministratorAccess");
    expect(json).not.toContain('"Action":"*"');
    expect(json).not.toMatch(/"Action":\s*\[\s*"\*"/);
  });

  test("does not grant Bedrock invoke while the model ID is unknown", () => {
    const json = JSON.stringify(template.toJSON());
    expect(json).not.toContain("bedrock:InvokeModel");
    expect(json).not.toContain("bedrock:*");
  });

  test("required stack outputs exist", () => {
    template.hasOutput("FuseRunsTableName", {});
    template.hasOutput("FuseEventsTableName", {});
    template.hasOutput("FuseEventBusName", {});
    template.hasOutput("FuseApiUrl", {});
    template.hasOutput("FuseRegion", {});
    template.hasOutput("FuseStackName", {});
  });

  test("live Bedrock mode is not enabled by default", () => {
    const json = JSON.stringify(template.toJSON());
    expect(json).toContain("FUSE_LIVE_BEDROCK");
    expect(json).toContain('"false"');
    expect(json).not.toContain('"FUSE_LIVE_BEDROCK":"true"');
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: Match.objectLike({
          FUSE_LIVE_BEDROCK: "false",
          BEDROCK_MODEL_ID: PLACEHOLDER_BEDROCK_MODEL_ID,
        }),
      },
    });
  });

  test("control Lambda stays synthetic with live Bedrock disabled", () => {
    const json = JSON.stringify(template.toJSON());
    expect(json).toContain("fuse-http-api");
    expect(json).toContain("liveBedrock=false");
    expect(json).not.toContain("liveBedrock=true");
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: Match.objectLike({
          FUSE_LIVE_BEDROCK: "false",
          BEDROCK_MODEL_ID: PLACEHOLDER_BEDROCK_MODEL_ID,
        }),
      },
    });
  });

  test("HTTP API exposes health, policies, and run routes", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /health",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /policies",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /runs",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /runs/{runId}",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /runs/{runId}/events",
    });
  });

  test("uses Node.js 22 Lambda runtimes", () => {
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs22.x",
    });
    template.resourceCountIs("AWS::Lambda::Function", 2);
  });
});
