#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";
import { ReactRouterSsrStack } from "../lib/ssr.stack";
// import { WafStack } from "../lib/waf.stack";
// Stack ID is derived from package.json name so it stays stable across checkouts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { name: appName } = require("../../package.json") as { name: string };

const app = new cdk.App();
const account = process.env.CDK_ACCOUNT_ID;
const region = process.env.CDK_DEFAULT_REGION;

// AUTH_* feature flags — only inject the ones explicitly set so defaults in code stay effective
const authFlags = Object.fromEntries(
  [
    "AUTH_ENABLE_CREDENTIALS",
    "AUTH_ENABLE_EMAIL_VERIFICATION",
    "AUTH_ENABLE_PASSWORD_RESET",
    "AUTH_ENABLE_GOOGLE",
    "AUTH_ENABLE_GITHUB",
    "AUTH_ALLOW_MULTI_SESSION",
  ]
    .filter((k) => process.env[k] !== undefined)
    .map((k) => [k, process.env[k]!]),
);

const environment: Record<string, string> = {
  COOKIE_SECRETS: process.env.COOKIE_SECRETS!,
  MONGODB_URI: process.env.MONGODB_URI!,
  SES_FROM_ADDRESS: process.env.SES_FROM_ADDRESS!,
  ...authFlags,
};

new ReactRouterSsrStack(app, `${appName}-Dev`, {
  env: { account, region },
  stage: "dev",
  appName,
  environment,
  logRetention: logs.RetentionDays.ONE_DAY,
  description: `React Router SSR Stack for ${appName} Development`,
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
  appName,
  environment,
  logRetention: logs.RetentionDays.ONE_MONTH,
  // webAclArn: stagingWaf.webAclArn,
  // reservedConcurrency: 50,
  // provisionedConcurrency: 2,
  description: `React Router SSR Stack for ${appName} Staging`,
});

// const prodWaf = new WafStack(app, `${appName}-Prod-Waf`, {
//   env: { account, region: "us-east-1" },
//   stage: "prod",
//   crossRegionReferences: true,
// });

new ReactRouterSsrStack(app, `${appName}-Prod`, {
  env: { account, region },
  stage: "prod",
  appName,
  environment,
  logRetention: logs.RetentionDays.THREE_MONTHS,
  // webAclArn: prodWaf.webAclArn,
  // reservedConcurrency: 200,
  // provisionedConcurrency: 5,
  description: `React Router SSR Stack for ${appName} Production`,
});
