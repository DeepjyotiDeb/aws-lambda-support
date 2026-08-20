# React Router v8 SSR on AWS

An opinionated project template for server-side rendered React Router v8 apps deployed to AWS using CDK. The stack provisions a Lambda function for SSR, an S3 bucket for static assets, and a CloudFront distribution in front of both.

Includes a full server-side auth system with sliding-window session management, MongoDB persistence, a DAO/service layer, and feature-flag-controlled auth flows (email verification, password reset, OAuth stubs).

Includes GitHub and Google OAuth login support.

To use this template run the following command
```bash
npx create-react-router@latest my-web-app --template DeepjyotiDeb/aws-lambda-support#mongo-auth
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

## Auth system

The template ships a complete session-based auth system. All auth logic is server-only — nothing sensitive reaches the client bundle.

### Session architecture

Auth uses two signed HttpOnly cookies managed by `app/server/cookie.ts`:

| Cookie | TTL | Purpose |
|---|---|---|
| `__session` | 5 minutes | Short-lived session, holds `userId` |
| `__refresh` | 30 days | Long-lived refresh token (hashed in MongoDB) |

The `authMiddleware` in `app/middleware/auth.middleware.ts` runs on every non-public request:

1. Checks `__session` for a valid `userId`
2. On miss, validates `__refresh` against the `tokens` MongoDB collection
3. If the refresh token has ≤ 15 days remaining, it is rotated (sliding window)
4. Looks up the user document and puts part of it in React Router context
5. Sets `Cache-Control: private, no-store` on every response

All protected routes receive the authenticated user automatically — no per-route auth checks needed.

### Pre-built routes

| Route | Purpose |
|---|---|
| `/login` | Email/password sign-in |
| `/register` | Account creation |
| `/logout` | Session + refresh token destruction |
| `/reset-password` | Request a password reset email |
| `/reset-password/confirm` | Consume reset token and set new password |
| `/verify-email` | Consume email verification token |

### Protecting and reading from routes

All routes are protected by default. To make a route public, add its path prefix to `PUBLIC_ALLOWLIST` in `app/middleware/auth.middleware.ts`.

To access the authenticated user in a loader or action:

```ts
import { userContext } from "~/context";

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!; // guaranteed non-null on protected routes
  return { email: user.email };
}
```

### Feature flags

Auth features are toggled via environment variables:

| Variable | Default | Effect |
|---|---|---|
| `AUTH_ENABLE_CREDENTIALS` | `true` | Email/password login and registration |
| `AUTH_ENABLE_EMAIL_VERIFICATION` | `false` | Require email verification on register |
| `AUTH_ENABLE_PASSWORD_RESET` | `false` | Enable password reset flow |
| `AUTH_ENABLE_GOOGLE` | `false` | Google OAuth (stub — wire up your own) |
| `AUTH_ENABLE_GITHUB` | `false` | GitHub OAuth (stub — wire up your own) |
| `AUTH_ALLOW_MULTI_SESSION` | `true` | Allow concurrent sessions per user |

### MongoDB setup

The app requires a MongoDB database. Set `MONGODB_URI` in your environment. Create the following indexes for performance and TTL cleanup:

```js
// Unique email lookup
db.users.createIndex({ email: 1 }, { unique: true })

// Token lookup by hash
db.tokens.createIndex({ tokenHash: 1, type: 1 })

// Auto-delete expired tokens
db.tokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })

// Rate limiter
db.rateLimits.createIndex({ key: 1 }, { unique: true })
db.rateLimits.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

### Code architecture

```
app/server/
  cookie.ts                  — dual-cookie definitions (__session + __refresh)
  db.ts                      — MongoDB connection + User type
  auth.ts                    — password hashing, createAuthResponse, destroyAuth
  dao/
    schemas/                 — valibot schemas (source of truth for document types)
    user.dao.ts              — User collection CRUD
    token.dao.ts             — Token collection CRUD
    rateLimit.dao.ts         — Rate limit collection CRUD
  services/
    user.service.ts          — register, login verification, email verification, password reset
    token.service.ts         — issue, validate, consume tokens
    rateLimiter.service.ts   — per-IP sliding window rate limiting
```

DAOs handle raw DB access only. Services own business logic. Routes handle HTTP parsing and response construction.

### Cookie secrets

`COOKIE_SECRETS` must be set as a comma-separated string. Rotate secrets by prepending a new value — old cookies remain valid until they expire:

```
COOKIE_SECRETS=new-secret,old-secret
```

## Known gotchas

### WebSockets and SSE
WebSockets are not supported. CloudFront does not upgrade HTTP connections to WebSocket when the origin is a Lambda Function URL. If you need WebSockets, deploy a separate CDK stack with an API Gateway WebSocket API and connect to it from the client side — it cannot be added to this template.

Server-Sent Events (SSE) are partially supported — Lambda response streaming can push data to the client, but connections are bounded by Lambda's 15-minute execution timeout and CloudFront's origin response timeout (60 seconds by default, configurable up to 60s). Long-lived SSE connections will be cut off. This setup is not suitable for applications that rely on persistent SSE streams.

### React Router single-fetch and CloudFront behavior routing
React Router v8 uses single fetch — form submissions and data requests are sent to `/<route>.data` (e.g. `POST /_.data`, `POST /logout.data`) rather than the page URL. These paths contain a dot, so they match the `*.*` CloudFront behavior that routes to S3. S3 rejects POST requests with a 403 `InvalidRequestMethod` error reported as `X-Cache: Error from CloudFront`.

The CDK stack handles this with a dedicated `*.data` behavior that routes to Lambda before `*.*` is evaluated. If React Router changes its internal URL conventions in a future version, a new behavior may need to be added.

### Environment variables must be set at deploy time
`COOKIE_SECRETS` and `MONGODB_URI` are passed as Lambda environment variables at deploy time. They are not stored in Secrets Manager by default. Make sure both are present in your shell environment (or CI) when running `npm run cdk:deploy:*`, otherwise the Lambda will start without them and session signing or database connections will fail at runtime.

### Stale Lambda code after CDK infrastructure-only changes
CDK detects code changes by hashing the `build/server` asset. If you change only CDK infrastructure (e.g. adding an environment variable) and redeploy, CDK may report `no changes` to the Lambda code and reuse the previously deployed bundle. Always run `npm run build` before deploying if app code has changed, or use `npm run cdk:deploy:*` which runs the build step automatically.

### Lambda cold starts
Without provisioned concurrency, the first request after a period of inactivity incurs a cold start of ~250–400ms. This is invisible for background traffic but noticeable for interactive pages. Provisioned concurrency eliminates this at additional cost — see the Optional section below.

### Custom Lambda adapter
This template includes a hand-rolled Lambda adapter in `app/server/adapter.ts` rather than using a third-party package such as [`@geostrategists/react-router-aws`](https://github.com/geostrategists/react-router-aws). That package covers the same Function URL streaming pattern with less boilerplate. The custom adapter gives you full visibility and control over the request/response pipeline at the cost of owning the code yourself.