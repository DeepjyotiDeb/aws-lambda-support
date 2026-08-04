import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as path from "path";

export interface ReactRouterSsrStackProps extends cdk.StackProps {
  stage: string;
  appName: string;
  originSecret?: string;
  webAclArn?: string;
  reservedConcurrency?: number;
  provisionedConcurrency?: number;
}

export class ReactRouterSsrStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ReactRouterSsrStackProps) {
    super(scope, id, props);

    const { stage, webAclArn, reservedConcurrency, provisionedConcurrency, appName, originSecret } =
      props;

    // 1. S3 Bucket for static client assets (build/client/)
    const staticAssetsBucket = new s3.Bucket(this, "StaticAssetsBucket", {
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 2. Lambda Function for SSR — uses Vite's pre-built output (build/server/index.mjs).
    //    lambda.Function is used instead of NodejsFunction because Vite already bundles everything.
    const ssrLambda = new lambda.Function(this, "SsrLambdaHandler", {
      functionName: `${appName}-${stage}-react-router-ssr`,
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, "../../build/server")),
      handler: "index.handler",
      memorySize: 512,
      timeout: cdk.Duration.seconds(15),
      reservedConcurrentExecutions: reservedConcurrency,
      environment: {
        ...(originSecret ? { ORIGIN_SECRET: originSecret } : {}),
      },
    });

    // 3. Alias — provisioned concurrency (if set) eliminates cold starts for staging/prod
    const ssrAlias = new lambda.Alias(this, "SsrAlias", {
      aliasName: "live",
      version: ssrLambda.currentVersion,
      provisionedConcurrentExecutions: provisionedConcurrency,
    });

    // 4. Lambda Function URL on the alias in RESPONSE_STREAM mode for React Router streaming
    const lambdaUrl = ssrAlias.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
      invokeMode: lambda.InvokeMode.RESPONSE_STREAM,
    });

    const lambdaDomain = cdk.Fn.parseDomainName(lambdaUrl.url);

    // 5. CloudFront Function: copies the viewer Host into x-viewer-host so the
    //    Lambda adapter can derive the correct host for React Router's CSRF check.
    //    (requestContext.domainName is always the internal *.lambda-url domain.)
    const viewerHostFunction = new cloudfront.Function(this, "ViewerHostFunction", {
      functionName: `${appName}-${stage}-viewer-host`,
      code: cloudfront.FunctionCode.fromInline(`
      function handler(event) {
        var host = event.request.headers.host;
        if (host) {
          event.request.headers["x-viewer-host"] = { value: host.value };
        } else {
          delete event.request.headers["x-viewer-host"];
        }
        return event.request;
      }
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // 6. CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, "SsrDistribution", {
      comment: `${appName}-${stage}-react-router-ssr`,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      webAclId: webAclArn,
      defaultBehavior: {
        origin: new origins.HttpOrigin(lambdaDomain, {
          ...(originSecret ? { customHeaders: { "x-origin-secret": originSecret } } : {}),
        }),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        functionAssociations: [
          {
            function: viewerHostFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
    });

    // Static assets served directly from S3
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(staticAssetsBucket);
    const staticBehavior = {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    };

    // Hashed build assets
    distribution.addBehavior("assets/*", s3Origin, staticBehavior);

    // All other static files from public/ (favicon.ico, robots.txt, sitemap.xml, etc.)
    // *.*  matches any path with a file extension; React Router routes never contain dots
    distribution.addBehavior("*.*", s3Origin, staticBehavior);

    // 7. Deploy build/client/ assets to S3
    new s3deploy.BucketDeployment(this, "DeployStaticAssets", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "../../build/client"))],
      destinationBucket: staticAssetsBucket,
      distribution,
      distributionPaths: ["/assets/*", "/*.*"],
      prune: true,
      memoryLimit: 1024,
    });

    new cdk.CfnOutput(this, "CloudFrontURL", {
      value: `https://${distribution.distributionDomainName}`,
      description: "CloudFront Distribution URL",
      exportName: `${appName}-${stage}-react-router-CloudFrontURL`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
      description: "CloudFront Distribution ID",
      exportName: `${appName}-${stage}-react-router-DistributionId`,
    });
  }
}
