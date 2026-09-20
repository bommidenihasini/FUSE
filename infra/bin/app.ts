#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { FuseStack } from "../lib/fuse-stack.js";

const app = new App();
new FuseStack(app, "FuseMvp", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
