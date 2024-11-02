#!/bin/bash

# deploy.sh - Deployment script for Bingo Game

# Configuration
STACK_NAME="bingo-game"
DOMAIN_NAME="your-domain.com"  # Replace with your domain
CERTIFICATE_ARN="your-certificate-arn"  # Replace with your SSL cert ARN
AWS_REGION="us-east-1"  # Replace with your preferred region
PROFILE="default"  # Replace with your AWS CLI profile if not using default

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Error handling function
handle_error() {
    echo -e "${RED}Error: $1${NC}"
    exit 1
}

# Success message function
success_message() {
    echo -e "${GREEN}$1${NC}"
}

# Warning message function
warning_message() {
    echo -e "${YELLOW}$1${NC}"
}

# Check if required tools are installed
check_requirements() {
    echo "Checking requirements..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        handle_error "AWS CLI is not installed. Please install it first."
    fi
    
    # Check SAM CLI
    if ! command -v sam &> /dev/null; then
        handle_error "AWS SAM CLI is not installed. Please install it first."
    }
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity --profile $PROFILE &> /dev/null; then
        handle_error "AWS credentials not configured. Please run 'aws configure' first."
    fi
    
    success_message "All requirements satisfied."
}

# Create and configure the ReportLab layer
create_lambda_layer() {
    echo "Creating ReportLab Lambda layer..."
    
    # Create layer directory if it doesn't exist
    mkdir -p lambda/layers/reportlab/python
    
    # Create virtual environment
    python -m venv lambda/layers/reportlab/venv
    
    # Activate virtual environment
    source lambda/layers/reportlab/venv/bin/activate
    
    # Install ReportLab
    pip install reportlab
    
    # Copy dependencies to layer directory
    cp -r lambda/layers/reportlab/venv/lib/python*/site-packages/* lambda/layers/reportlab/python/
    
    # Cleanup
    deactivate
    rm -rf lambda/layers/reportlab/venv
    
    success_message "Lambda layer created successfully."
}

# Build and deploy SAM application
deploy_sam_application() {
    echo "Building SAM application..."
    
    # Build SAM application
    sam build || handle_error "SAM build failed"
    
    echo "Deploying SAM application..."
    
    # Deploy SAM application
    sam deploy \
        --stack-name $STACK_NAME \
        --parameter-overrides \
            DomainName=$DOMAIN_NAME \
            CertificateArn=$CERTIFICATE_ARN \
        --capabilities CAPABILITY_IAM \
        --region $AWS_REGION \
        --profile $PROFILE \
        --no-confirm-changeset \
        --no-fail-on-empty-changeset || handle_error "SAM deployment failed"
    
    success_message "SAM application deployed successfully."
}

# Upload static assets to S3
upload_static_assets() {
    echo "Uploading static assets..."
    
    # Get S3 bucket name from CloudFormation stack
    WEBSITE_BUCKET=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`WebsiteBucketName`].OutputValue' \
        --output text \
        --region $AWS_REGION \
        --profile $PROFILE)
    
    THEMES_BUCKET="${DOMAIN_NAME}-themes"
    
    # Upload static files
    aws s3 sync ./static s3://$WEBSITE_BUCKET/static/ \
        --delete \
        --region $AWS_REGION \
        --profile $PROFILE || handle_error "Failed to upload static assets"
    
    # Upload HTML templates
    aws s3 sync ./templates s3://$WEBSITE_BUCKET/ \
        --delete \
        --exclude "*" \
        --include "*.html" \
        --region $AWS_REGION \
        --profile $PROFILE || handle_error "Failed to upload HTML templates"
    
    # Upload theme files
    aws s3 sync ./bingo_items s3://$THEMES_BUCKET/themes/ \
        --delete \
        --region $AWS_REGION \
        --profile $PROFILE || handle_error "Failed to upload theme files"
    
    success_message "Static assets uploaded successfully."
}

# Invalidate CloudFront cache
invalidate_cloudfront() {
    echo "Invalidating CloudFront cache..."
    
    # Get CloudFront distribution ID
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Aliases.Items[?contains(@,'$DOMAIN_NAME')]].Id" \
        --output text \
        --region $AWS_REGION \
        --profile $PROFILE)
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*" \
            --region $AWS_REGION \
            --profile $PROFILE || warning_message "CloudFront invalidation failed"
        
        success_message "CloudFront cache invalidated successfully."
    else
        warning_message "No CloudFront distribution found for $DOMAIN_NAME"
    fi
}

# Display deployment information
show_deployment_info() {
    echo -e "\n${GREEN}Deployment Complete!${NC}"
    
    # Get CloudFront domain name
    CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' \
        --output text \
        --region $AWS_REGION \
        --profile $PROFILE)
    
    # Get API endpoint
    API_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
        --output text \
        --region $AWS_REGION \
        --profile $PROFILE)
    
    echo -e "\nDeployment Information:"
    echo -e "Website URL: ${GREEN}https://$DOMAIN_NAME${NC}"
    echo -e "CloudFront Domain: ${GREEN}$CLOUDFRONT_DOMAIN${NC}"
    echo -e "API Endpoint: ${GREEN}$API_ENDPOINT${NC}"
    
    echo -e "\nNext Steps:"
    echo "1. Configure your DNS provider to point $DOMAIN_NAME to the CloudFront domain"
    echo "2. Wait for DNS propagation (may take up to 48 hours)"
    echo "3. Test your website at https://$DOMAIN_NAME"
    
    echo -e "\n${YELLOW}Note: If this is your first deployment, DNS configuration is required.${NC}"
}

# Main deployment process
main() {
    echo "Starting deployment process..."
    
    # Check requirements
    check_requirements
    
    # Create Lambda layer
    create_lambda_layer
    
    # Deploy SAM application
    deploy_sam_application
    
    # Upload static assets
    upload_static_assets
    
    # Invalidate CloudFront cache
    invalidate_cloudfront
    
    # Show deployment information
    show_deployment_info
}

# Start deployment
main