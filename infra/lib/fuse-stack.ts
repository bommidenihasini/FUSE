import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from "aws-cdk-lib/aws-events";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";

/** Placeholder until a human verifies Bedrock model access. Never a guessed ARN. */
export const PLACEHOLDER_BEDROCK_MODEL_ID = "<approved-model-id>";

export const FUSE_EVENT_SOURCE = "fuse.breaker";
export const FUSE_BREAKER_DETAIL_TYPE = "BreakerTripped";

const CONTROL_HANDLER = `'use strict';
exports.handler = async function () {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      service: 'fuse-api',
      mode: 'synthetic',
      liveBedrock: false
    })
  };
};
`;

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
      message: 'Runner is not implemented. Bedrock invoke is not granted until a model ID is verified.'
    })
  };
};
`;

export class FuseStack extends cdk.Stack {
  public readonly runsTable: dynamodb.Table;
  public readonly eventsTable: dynamodb.Table;
  public readonly eventBus: events.EventBus;
  public readonly api: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      description:
        "Fuse development stack (C1.4). RemovalPolicy.DESTROY is development-only. Do not deploy until region and credentials are verified.",
    });

    this.runsTable = new dynamodb.Table(this, "FuseRuns", {
      tableName: undefined,
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
        "Runner Lambda. No administrator access. Bedrock invoke omitted until BEDROCK_MODEL_ID is verified.",
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

    const controlFn = new lambda.Function(this, "FuseControlFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(CONTROL_HANDLER),
      description: "Placeholder control-plane Lambda. Not a complete API.",
      environment: sharedEnv,
      logGroup: controlLogGroup,
      role: controlRole,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    const runnerFn = new lambda.Function(this, "FuseRunnerFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromInline(RUNNER_HANDLER),
      description: "Placeholder runner Lambda. No Bedrock invoke until model ID is verified.",
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

    this.api = new apigwv2.HttpApi(this, "FuseHttpApi", {
      apiName: "fuse-http-api",
      description:
        "Fuse HTTP API. GET /health is wired. Full run API is @fuse/api (local, synthetic).",
    });
    this.api.addRoutes({
      path: "/health",
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration("HealthIntegration", controlFn),
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
  }
}
