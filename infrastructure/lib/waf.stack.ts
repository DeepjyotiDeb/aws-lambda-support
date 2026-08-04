import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as wafv2 from "aws-cdk-lib/aws-wafv2";

export interface WafStackProps extends cdk.StackProps {
  stage: string;
  appName: string;
  // Requests per 5-minute window per IP before blocking; defaults to 2000
  rateLimit?: number;
}

export class WafStack extends cdk.Stack {
  public readonly webAclArn: string;

  constructor(scope: Construct, id: string, props: WafStackProps) {
    // WAF for CloudFront must always be in us-east-1
    super(scope, id, { ...props, env: { ...props.env, region: "us-east-1" } });

    const { stage, rateLimit = 2000, appName } = props;

    const visibilityConfig = (metricName: string): wafv2.CfnWebACL.VisibilityConfigProperty => ({
      cloudWatchMetricsEnabled: true,
      metricName,
      sampledRequestsEnabled: true,
    });

    const webAcl = new wafv2.CfnWebACL(this, "WebACL", {
      name: `${appName}-${stage}-react-router-waf`,
      scope: "CLOUDFRONT",
      defaultAction: { allow: {} },
      visibilityConfig: visibilityConfig(`${appName}-${stage}-react-router-waf`),
      rules: [
        {
          name: "RateLimitPerIp",
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: rateLimit,
              aggregateKeyType: "IP",
            },
          },
          visibilityConfig: visibilityConfig(`${appName}-${stage}-rate-limit`),
        },
        {
          name: "AWSManagedRulesCommonRuleSet",
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: "AWS",
              name: "AWSManagedRulesCommonRuleSet",
            },
          },
          visibilityConfig: visibilityConfig(`${appName}-${stage}-common-rules`),
        },
      ],
    });

    this.webAclArn = webAcl.attrArn;
  }
}
