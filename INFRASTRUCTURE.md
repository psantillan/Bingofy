# Infrastructure Documentation

This document provides detailed information about the AWS infrastructure used in the Bingo Game project.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [AWS Services](#aws-services)
- [Security Configuration](#security-configuration)
- [Cost Optimization](#cost-optimization)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Scaling Considerations](#scaling-considerations)
- [Disaster Recovery](#disaster-recovery)
- [Infrastructure as Code](#infrastructure-as-code)
- [CI/CD Pipeline](#cicd-pipeline)

## Architecture Overview

![Architecture Diagram](architecture.png)

### Request Flow

1. **User Access**
   - Users access the application via CloudFront
   - SSL/TLS termination at CloudFront
   - WAF rules applied at edge

2. **Static Content**
   - Served from S3 via CloudFront
   - Browser caching enabled
   - Compression enabled

3. **API Requests**
   - Routed through API Gateway
   - Lambda functions process requests
   - S3 for theme storage

4. **PDF Generation**
   - Dedicated Lambda function
   - ReportLab for PDF creation
   - Binary response handling

## AWS Services

### Content Delivery
- **CloudFront**
  - Distribution Settings:
    ```yaml
    PriceClass: PriceClass_100
    HTTPVersion: http2
    DefaultTTL: 86400
    Compress: true
    ```
  - Custom domain support
  - Edge locations optimized

### Storage
- **S3 Buckets**
  1. Website Bucket
     ```yaml
     WebsiteBucket:
       Versioning: Disabled
       Encryption: AES-256
       PublicAccess: Blocked
       CDN: Enabled
     ```
  2. Themes Bucket
     ```yaml
     ThemesBucket:
       Versioning: Enabled
       Encryption: AES-256
       PublicAccess: Blocked
       BackupPolicy: Enabled
     ```

### Compute
- **Lambda Functions**
  1. Board Generator
     ```yaml
     Memory: 256MB
     Timeout: 30s
     Runtime: Python 3.9
     ConcurrentExecutions: 100
     ```
  2. PDF Generator
     ```yaml
     Memory: 512MB
     Timeout: 30s
     Runtime: Python 3.9
     ConcurrentExecutions: 50
     ```

### API Layer
- **API Gateway**
  ```yaml
  HttpApi:
    PayloadFormatVersion: "2.0"
    CorsEnabled: true
    AuthorizationType: NONE
    ThrottlingBurstLimit: 100
    ThrottlingRateLimit: 50
  ```

### DNS & SSL
- **Route53**
  - Hosted zone configuration
  - Health checks enabled
- **Certificate Manager**
  - SSL/TLS certificate
  - Auto-renewal enabled

## Security Configuration

### WAF Rules
```yaml
WebACL:
  RateLimit:
    Limit: 2000/5min
    Action: Block
  BadBotProtection: Enabled
  SQLInjectionProtection: Enabled
  XSSProtection: Enabled
```

### IAM Roles
1. **Lambda Execution Role**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "logs:CreateLogGroup",
           "logs:CreateLogStream",
           "logs:PutLogEvents"
         ],
         "Resource": [
           "arn:aws:s3:::${ThemesBucket}/*",
           "arn:aws:logs:*:*:*"
         ]
       }
     ]
   }
   ```

2. **CloudFront OAI Role**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::${WebsiteBucket}/*"
       }
     ]
   }
   ```

### Security Headers
```yaml
ResponseHeaders:
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: "1; mode=block"
  Content-Security-Policy: "default-src 'self'"
  Strict-Transport-Security: "max-age=31536000; includeSubDomains"
```

## Cost Optimization

### Strategies
1. **CloudFront Optimization**
   - PriceClass_100 for reduced costs
   - Effective cache policies
   - Compression enabled

2. **Lambda Optimization**
   - Memory allocation tuned
   - Concurrent execution limits
   - Cold start mitigation

3. **S3 Optimization**
   - Lifecycle policies
   - Infrequent access for old themes
   - Versioning only where needed

### Estimated Costs
```yaml
Monthly Estimates:
  CloudFront:
    DataTransfer: ~$0.085/GB
    Requests: ~$0.0075/10,000
  Lambda:
    Execution: ~$0.20/million requests
    Memory: Based on configuration
  S3:
    Storage: ~$0.023/GB
    Requests: ~$0.0004/1,000
```

## Monitoring and Alerts

### CloudWatch Metrics
```yaml
Metrics:
  API:
    - 5XXError
    - 4XXError
    - Latency
  Lambda:
    - Errors
    - Duration
    - Throttles
  CloudFront:
    - Requests
    - BytesDownloaded
    - ErrorRate
```

### Alarms
```yaml
Alarms:
  APIErrorRate:
    Threshold: 5%
    Period: 5 minutes
    Action: SNS
  LambdaErrors:
    Threshold: 3
    Period: 5 minutes
    Action: SNS
  CostThreshold:
    Threshold: $50
    Period: Monthly
    Action: Email
```

## Scaling Considerations

### Automatic Scaling
- Lambda concurrency: Auto-scales to account limits
- CloudFront: Auto-scales globally
- API Gateway: Scales to account limits

### Manual Scaling Steps
1. Increase Lambda memory/timeout
2. Adjust WAF rate limits
3. Request AWS limit increases

### Load Testing Results
```yaml
Performance:
  ConcurrentUsers: 1000
  ResponseTime: <500ms
  ErrorRate: <0.1%
  Throttling: None
```

## Disaster Recovery

### Backup Strategy
```yaml
Backups:
  ThemesBucket:
    Versioning: Enabled
    CrossRegionReplication: Enabled
    RetentionPolicy: 30 days
  Configuration:
    BackupFrequency: Daily
    RetentionPeriod: 30 days
```

### Recovery Procedures
1. **S3 Data Loss**
   ```bash
   aws s3 cp s3://backup-bucket/themes s3://production-bucket/themes --recursive
   ```

2. **DNS Failover**
   ```bash
   aws route53 change-resource-record-sets --hosted-zone-id ${ZONE_ID} --change-batch file://failover.json
   ```

3. **Stack Recovery**
   ```bash
   aws cloudformation deploy --template-file template.yaml --stack-name ${STACK_NAME}-recovery
   ```

## Infrastructure as Code

### SAM Template Organization
```yaml
Components:
  - template.yaml          # Main template
  - parameters/
    - dev.json
    - prod.json
  - policies/
    - lambda-role.json
    - s3-policy.json
```

### Deployment Workflow
1. **Local Testing**
   ```bash
   sam local start-api
   sam local invoke GeneratePDFFunction
   ```

2. **Staged Deployment**
   ```bash
   ./deploy.sh dev
   ./deploy.sh prod
   ```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: aws-actions/setup-sam@v1
      - uses: aws-actions/configure-aws-credentials@v1
      - run: sam build
      - run: sam deploy --no-confirm-changeset
```

### Testing Pipeline
```yaml
Stages:
  - Lint
  - Unit Tests
  - Integration Tests
  - Infrastructure Tests
  - Security Scan
  - Deploy to Dev
  - End-to-End Tests
  - Deploy to Prod
```

## Appendix

### Useful Commands
```bash
# Check deployment status
aws cloudformation describe-stacks --stack-name ${STACK_NAME}

# Monitor Lambda logs
aws logs tail /aws/lambda/${FUNCTION_NAME} --follow

# Update WAF rules
aws wafv2 update-web-acl --web-acl-id ${ACL_ID} --rules file://rules.json

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id ${DIST_ID} --paths "/*"
```

### Resource Naming Convention
```yaml
Naming:
  Stack: ${Project}-${Environment}-${Region}
  Functions: ${Project}-${Environment}-${Purpose}
  Buckets: ${Domain}-${Purpose}-${Environment}
  LogGroups: /aws/${Service}/${Function}
```

---

For implementation details, refer to the [README.md](README.md)

