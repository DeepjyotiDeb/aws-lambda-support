# React Router v8 SSR on AWS

A project template for server-side rendered React Router v8 apps deployed to AWS using CDK. The stack provisions a Lambda function for SSR, an S3 bucket for static assets, and a CloudFront distribution in front of both.

## Architecture

- **CloudFront** — CDN that routes `/assets/*` to S3 and everything else to the Lambda function URL
- **Lambda** — runs the React Router SSR handler built by Vite
- **S3** — serves the pre-built static client assets

## Prerequisites

- An AWS account with credentials configured locally
- AWS CDK CLI: `npm install -g aws-cdk`
- Node.js 22.21.1+

## First-time setup

Bootstrap CDK in your AWS account (one-time per account/region):

```bash
cd infrastructure
npx cdk bootstrap
```

## Local development

```bash
npm install
npm run dev
```

## Deployment

Deploy to a stage from the project root:

```bash
npm run cdk:deploy:dev
npm run cdk:deploy:staging
npm run cdk:deploy:prod
```

Each command builds the app first, then deploys the CDK stack.

> **Windows note:** The deploy scripts use `$(npm run --silent cdk:name)` to derive the stack name, which requires a Unix shell. On Windows, edit the relevant script in `package.json` and replace that subshell expression with your app name directly. The name must match the value in `package.json` `"name"` field, which is what was used when you ran `npx cdk bootstrap`:
> ```json
> "cdk:deploy:dev": "npm run build && npm run cdk -- deploy YOUR_APP_NAME-Dev"
> ```

## Teardown

```bash
npm run cdk:destroy:dev
npm run cdk:destroy:staging
npm run cdk:destroy:prod
```

> **Note:** Destroying a stack deletes the S3 bucket and all its contents. Make sure you do not need the bucket contents before running destroy.

## Optional: WAF and Lambda concurrency

These features are commented out in [infrastructure/bin/app.ts](infrastructure/bin/app.ts) by default because they incur additional AWS charges.

### WAF (Web Application Firewall)

Attaches a CloudFront WAF WebACL to staging and prod distributions. Includes:

- IP-based rate limiting (blocks IPs exceeding 2000 requests per 5 minutes)
- AWS Managed Rules Common Rule Set (covers OWASP Top 10 — SQLi, XSS, etc.)

**Cost:** ~$5/month per WebACL + $0.60 per million requests.

To enable, uncomment the following in `infrastructure/bin/app.ts`:

1. The `WafStack` import at the top of the file
2. The `stagingWaf` and `prodWaf` stack instantiation blocks
3. The `webAclArn` prop inside the staging and prod `ReactRouterSsrStack` calls

> WAF WebACLs for CloudFront must be deployed in `us-east-1`. The `WafStack` enforces this automatically.

### Lambda concurrency

`reservedConcurrency` caps how many concurrent executions the function can have, protecting the rest of your AWS account from a traffic spike consuming all available concurrency.

`provisionedConcurrency` keeps a number of Lambda execution environments pre-initialized, eliminating cold starts. It is set on a Lambda alias (`live`) so it does not affect the raw function.

**Cost:** provisioned concurrency is billed per GB-second for the pre-initialized environments, even when idle. At the defaults (2 for staging, 5 for prod) this is roughly $3–8/month per stage depending on region.

To enable, uncomment the `reservedConcurrency` and `provisionedConcurrency` props inside the staging and prod `ReactRouterSsrStack` calls in `infrastructure/bin/app.ts`. Adjust the values to fit your expected traffic.