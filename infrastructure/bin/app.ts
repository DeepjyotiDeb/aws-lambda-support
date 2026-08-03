#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ReactRouterSsrStack } from "../lib/ssr.stack";

const app = new cdk.App();
const account = process.env.CDK_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION || "ap-south-1";
// Stack ID is derived from package.json name so it stays stable across checkouts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { name: appName } = require("../../package.json") as { name: string };

new ReactRouterSsrStack(app, `${appName}-Dev`, {
  env: { account, region },
  stage: "dev",
  description: `React Router SSR Stack for ${appName} — Development`,
});

new ReactRouterSsrStack(app, `${appName}-Staging`, {
  env: { account, region },
  stage: "staging",
  description: `React Router SSR Stack for ${appName} — Staging`,
});

new ReactRouterSsrStack(app, `${appName}-Prod`, {
  env: { account, region },
  stage: "prod",
  description: `React Router SSR Stack for ${appName} — Production`,
});
