#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ReactRouterSsrStack } from "../lib/ssr.stack";
// import { WafStack } from "../lib/waf.stack";

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

// To enable WAF on staging/prod, uncomment the WafStack import above and the blocks below.
// WAF incurs charges (~$5/mo per WebACL + $0.60/million requests).

// const stagingWaf = new WafStack(app, `${appName}-Staging-Waf`, {
//   env: { account, region: "us-east-1" },
//   stage: "staging",
//   crossRegionReferences: true,
// });

new ReactRouterSsrStack(app, `${appName}-Staging`, {
  env: { account, region },
  stage: "staging",
  // webAclArn: stagingWaf.webAclArn,
  // reservedConcurrency: 50,
  // provisionedConcurrency: 2,
  description: `React Router SSR Stack for ${appName} — Staging`,
});

// const prodWaf = new WafStack(app, `${appName}-Prod-Waf`, {
//   env: { account, region: "us-east-1" },
//   stage: "prod",
//   crossRegionReferences: true,
// });

new ReactRouterSsrStack(app, `${appName}-Prod`, {
  env: { account, region },
  stage: "prod",
  // webAclArn: prodWaf.webAclArn,
  // reservedConcurrency: 200,
  // provisionedConcurrency: 5,
  description: `React Router SSR Stack for ${appName} — Production`,
});
