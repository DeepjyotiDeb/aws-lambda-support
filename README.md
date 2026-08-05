# React Router v8 SSR on AWS

A project template for server-side rendered React Router v8 apps deployed to AWS using CDK. The stack provisions a Lambda function for SSR, an S3 bucket for static assets, and a CloudFront distribution in front of both.

To use this template run the following command
```bash
npx create-react-router@latest my-web-app --template DeepjyotiDeb/aws-lambda-support
```

## Architecture

- **CloudFront** — CDN that routes `/assets/*` to S3 and everything else to the Lambda function URL
- **Lambda** — runs the React Router SSR handler built by Vite
- **S3** — serves the pre-built static client assets

## Prerequisites

- An AWS account with credentials configured locally
- AWS CDK CLI: install using `npm install -g aws-cdk`
- Node.js 22.22.1+

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

## Known gotchas

### WebSockets and SSE
WebSockets are not supported. CloudFront does not upgrade HTTP connections to WebSocket when the origin is a Lambda Function URL. If you need WebSockets, deploy a separate CDK stack with an API Gateway WebSocket API and connect to it from the client side — it cannot be added to this template.

Server-Sent Events (SSE) are partially supported — Lambda response streaming can push data to the client, but connections are bounded by Lambda's 15-minute execution timeout and CloudFront's origin response timeout (60 seconds by default, configurable up to 60s). Long-lived SSE connections will be cut off. This setup is not suitable for applications that rely on persistent SSE streams.

### React Router single-fetch and CloudFront behavior routing
React Router v8 uses single fetch — form submissions and data requests are sent to `/<route>.data` (e.g. `POST /_.data`, `POST /logout.data`) rather than the page URL. These paths contain a dot, so they match the `*.*` CloudFront behavior that routes to S3. S3 rejects POST requests with a 403 `InvalidRequestMethod` error reported as `X-Cache: Error from CloudFront`.

The CDK stack handles this with a dedicated `*.data` behavior that routes to Lambda before `*.*` is evaluated. If React Router changes its internal URL conventions in a future version, a new behavior may need to be added.

### Environment variables must be set at deploy time
`SESSION_SECRET` and `ORIGIN_SECRET` are passed as Lambda environment variables at deploy time. They are not stored in Secrets Manager by default. Make sure both are present in your shell environment (or CI) when running `npm run cdk:deploy:*`, otherwise the Lambda will start without them and session signing will fail at runtime.

### Stale Lambda code after CDK infrastructure-only changes
CDK detects code changes by hashing the `build/server` asset. If you change only CDK infrastructure (e.g. adding an environment variable) and redeploy, CDK may report `no changes` to the Lambda code and reuse the previously deployed bundle. Always run `npm run build` before deploying if app code has changed, or use `npm run cdk:deploy:*` which runs the build step automatically.

### Lambda cold starts
Without provisioned concurrency, the first request after a period of inactivity incurs a cold start of ~250–400ms. This is invisible for background traffic but noticeable for interactive pages. Provisioned concurrency eliminates this at additional cost — see the Optional section below.

## Cost

All resources are pay-per-use. The infrastructure has no standing charges by default — you pay nothing when there is no traffic. Note that charges will be incurred if there is significant enough traffic.

| Monthly SSR requests | Approx cost |
|---|---|
| 0 | $0 |
| 100K | ~$0.12 |
| 1M | ~$1.20 |
| 5M | ~$18 |
| 10M | ~$40 |

Static assets (`/assets/*`) are served from S3 via CloudFront with caching and never hit Lambda.

The optional WAF and provisioned concurrency features (see below) add fixed monthly costs regardless of traffic.

## Optional: WAF and Lambda concurrency

These features are commented out in [infrastructure/bin/app.ts](infrastructure/bin/app.ts) by default because they incur additional AWS charges.

### WAF (Web Application Firewall)

Attaches a CloudFront WAF WebACL to staging and prod distributions. Includes IP-based rate limiting (2000 req/5 min per IP) and the AWS Managed Rules Common Rule Set (OWASP Top 10 — SQLi, XSS, etc.).

**Cost:** $5/month per WebACL + $0.60 per million requests (~$10–12/month fixed for staging + prod).

To enable, uncomment the following in `infrastructure/bin/app.ts`:

1. The `WafStack` import at the top of the file
2. The `stagingWaf` and `prodWaf` stack instantiation blocks
3. The `webAclArn` prop inside the staging and prod `ReactRouterSsrStack` calls

> WAF WebACLs for CloudFront must be in `us-east-1`. The `WafStack` enforces this automatically.

### Lambda concurrency

`reservedConcurrency` caps how many concurrent executions the function can have, protecting the rest of your AWS account from a traffic spike.

`provisionedConcurrency` keeps Lambda environments pre-initialized to eliminate cold starts (~200–400ms). It is billed per GB-second for the entire time environments are kept alive, even when idle.

**Cost:** ~$24/month for staging (2 environments) and ~$60/month for prod (5 environments).

To enable, uncomment the `reservedConcurrency` and `provisionedConcurrency` props inside the staging and prod `ReactRouterSsrStack` calls in `infrastructure/bin/app.ts`.


