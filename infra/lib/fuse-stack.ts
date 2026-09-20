import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";

/** Placeholder until a human verifies Bedrock model access. Never a guessed ARN. */
export const PLACEHOLDER_BEDROCK_MODEL_ID = "<approved-model-id>";

export const FUSE_EVENT_SOURCE = "fuse.breaker";
export const FUSE_BREAKER_DETAIL_TYPE = "BreakerTripped";

const RUNNER_HANDLER = `'use strict';
exports.handler = async function () {
  return {
    statusCode: 501,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ok: false,
      service: 'fuse-runner',
      implemented: false,
      liveBedrock: false,
      message: 'Live Bedrock runner is not enabled. FUSE_LIVE_BEDROCK stays false until Converse is allowed.'
    })
  };
};
`;

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    dir = path.resolve(dir, "..");
  }
  throw new Error("Cannot locate Fuse repo root from CDK stack");
}

export class FuseStack extends cdk.Stack {
  public readonly runsTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly eventBus: events.EventBus;
  public readonly api: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      description:
        "Fuse synthetic demo stack. liveBedrock=false. RemovalPolicy.DESTROY is development-only.",
    });

    const repoRoot = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
    const skipDashboard = this.node.tryGetContext("fuse:skipDashboard") === true;

    this.runsTable = new dynamodb.Table(this, "FuseRuns", {
      partitionKey: { name: "runId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    this.eventsTable = new dynamodb.Table(this, "FuseEvents", {
      partitionKey: { name: "runId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sequence", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    this.eventBus = new events.EventBus(this, "FuseEventBus", {
      eventBusName: "fuse-breaker",
    });
    this.eventBus.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    const controlLogGroup = new logs.LogGroup(this, "FuseControlLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const runnerLogGroup = new logs.LogGroup(this, "FuseRunnerLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const controlRole = new iam.Role(this, "FuseControlRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: "Control-plane Lambda. No administrator access. No Bedrock invoke.",
    });
    const runnerRole = new iam.Role(this, "FuseRunnerRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description:
        "Placeholder Bedrock runner. No administrator access. Bedrock invoke omitted until Converse is allowed.",
    });
    controlLogGroup.grantWrite(controlRole);
    runnerLogGroup.grantWrite(runnerRole);

    const sharedEnv = {
      BEDROCK_MODEL_ID: PLACEHOLDER_BEDROCK_MODEL_ID,
      FUSE_LIVE_BEDROCK: "false",
      FUSE_RUNS_TABLE: this.runsTable.tableName,
      FUSE_EVENTS_TABLE: this.eventsTable.tableName,
      FUSE_EVENT_BUS_NAME: this.eventBus.eventBusName,
      FUSE_EVENT_SOURCE,
      FUSE_BREAKER_DETAIL_TYPE,
      PUBLIC_DEMO_MODE: "true",
    };

    const controlFn = new NodejsFunction(this, "FuseControlFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: path.join(repoRoot, "packages/api/src/lambda.ts"),
      handler: "handler",
      depsLockFilePath: path.join(repoRoot, "pnpm-lock.yaml"),
      projectRoot: repoRoot,
      description: "Synthetic Fuse HTTP API. liveBedrock=false. Not live Bedrock.",
      environment: sharedEnv,
      logGroup: controlLogGroup,
      role: controlRole,
      timeout: cdk.Duration.seconds(29),
      memorySize: 512,
      bundling: {
        format: OutputFormat.CJS,
        minify: true,
        sourceMap: true,
        target: "node22",
        forceDockerBundling: false,
      },
    });

    const runnerFn = new lambda.Function(this, "FuseRunnerFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(RUNNER_HANDLER),
      description: "Placeholder runner Lambda. No Bedrock invoke until Converse is allowed.",
      environment: sharedEnv,
      logGroup: runnerLogGroup,
      role: runnerRole,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    this.runsTable.grantReadWriteData(controlFn);
    this.eventsTable.grantReadWriteData(controlFn);
    this.eventBus.grantPutEventsTo(controlFn);

    this.runsTable.grantReadWriteData(runnerFn);
    this.eventsTable.grantReadWriteData(runnerFn);
    this.eventBus.grantPutEventsTo(runnerFn);

    const controlIntegration = new HttpLambdaIntegration("ControlIntegration", controlFn);

    this.api = new apigwv2.HttpApi(this, "FuseHttpApi", {
      apiName: "fuse-http-api",
      description: "Fuse synthetic HTTP API. liveBedrock=false.",
      corsPreflight: {
        allowHeaders: ["content-type", "idempotency-key"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ["*"],
        maxAge: cdk.Duration.days(1),
      },
    });

    this.api.addRoutes({
      path: "/health",
      methods: [apigwv2.HttpMethod.GET],
      integration: controlIntegration,
    });
    this.api.addRoutes({
      path: "/policies",
      methods: [apigwv2.HttpMethod.GET],
      integration: controlIntegration,
    });
    this.api.addRoutes({
      path: "/runs",
      methods: [apigwv2.HttpMethod.POST],
      integration: controlIntegration,
    });
    this.api.addRoutes({
      path: "/runs/{runId}",
      methods: [apigwv2.HttpMethod.GET],
      integration: controlIntegration,
    });
    this.api.addRoutes({
      path: "/runs/{runId}/events",
      methods: [apigwv2.HttpMethod.GET],
      integration: controlIntegration,
    });

    new cdk.CfnOutput(this, "FuseRunsTableName", {
      value: this.runsTable.tableName,
    });
    new cdk.CfnOutput(this, "FuseEventsTableName", {
      value: this.eventsTable.tableName,
    });
    new cdk.CfnOutput(this, "FuseEventBusName", {
      value: this.eventBus.eventBusName,
    });
    new cdk.CfnOutput(this, "FuseApiUrl", {
      value: this.api.apiEndpoint,
    });
    new cdk.CfnOutput(this, "FuseRegion", {
      value: cdk.Aws.REGION,
    });
    new cdk.CfnOutput(this, "FuseStackName", {
      value: cdk.Aws.STACK_NAME,
    });

    if (!skipDashboard) {
      const dashboardDist = path.join(repoRoot, "apps/dashboard/dist");
      if (!existsSync(path.join(dashboardDist, "index.html"))) {
        throw new Error("Build the dashboard first: pnpm --filter @fuse/dashboard build");
      }

      const dashboardBucket = new s3.Bucket(this, "FuseDashboardBucket", {
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        encryption: s3.BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      });

      const apiDomain = cdk.Fn.select(2, cdk.Fn.split("/", `${this.api.apiEndpoint}/`));
      const apiOrigin = new origins.HttpOrigin(apiDomain, {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      });
      const apiBehavior: cloudfront.BehaviorOptions = {
        origin: apiOrigin,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
      };

      const distribution = new cloudfront.Distribution(this, "FuseDashboardDistribution", {
        comment: "Fuse synthetic control room. liveBedrock=false.",
        defaultRootObject: "index.html",
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(dashboardBucket),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        additionalBehaviors: {
          "/health": apiBehavior,
          "/policies": apiBehavior,
          "/runs": apiBehavior,
          "/runs/*": apiBehavior,
        },
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.seconds(0),
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
            ttl: cdk.Duration.seconds(0),
          },
        ],
      });

      new s3deploy.BucketDeployment(this, "FuseDashboardDeploy", {
        destinationBucket: dashboardBucket,
        distribution,
        distributionPaths: ["/*"],
        sources: [s3deploy.Source.asset(dashboardDist)],
      });

      new cdk.CfnOutput(this, "FuseDashboardUrl", {
        value: `https://${distribution.distributionDomainName}`,
      });
    }
  }
}
