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