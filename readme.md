# Bingo Game Generator

A serverless web application for creating customizable bingo boards with multiple themes, printer-friendly PDF generation, and interactive gameplay features.


## Features

- 🎨 Multiple customizable themes (Christmas, Road Trip, Cooking Show, etc.)
- 📱 Responsive design for all devices
- 🖨️ Printer-friendly PDF generation
- 🎮 Interactive gameplay with win detection
- ✨ Theme-specific special effects and animations
- 🚀 Serverless architecture using AWS
- 🔒 Secure and scalable infrastructure

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Project Structure](#project-structure)
- [Adding New Themes](#adding-new-themes)
- [AWS Deployment](#aws-deployment)
- [Architecture](#architecture)
- [Customization](#customization)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Local Development
- Python 3.9 or higher
- Flask
- ReportLab
- NodeJS (for frontend development)

### AWS Deployment
- AWS CLI
- AWS SAM CLI
- Domain name
- SSL certificate in AWS Certificate Manager
- AWS account with appropriate permissions

## Local Development

1. Clone the repository:
```bash
git clone https://github.com/psantillan/Bingofy.git
cd Bingofy
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the development server:
```bash
python app.py
```

The application will be available at `http://localhost:5005`

## Project Structure

```
Bingofy/
├── app.py                 # Flask development server
├── lambda/               # AWS Lambda functions
│   ├── generate_board/
│   ├── generate_pdf/
│   └── layers/
├── static/              # Static assets
│   ├── css/
│   ├── js/
│   └── themes/
├── templates/           # HTML templates
├── bingo_items/        # Theme configuration files
├── template.yaml       # AWS SAM template
└── deploy.sh           # Deployment script
```

## Adding New Themes

1. Create a new theme configuration file in `bingo_items/`:
```json
{
    "title": "Your Theme",
    "description": "Theme description",
    "free_space": "FREE SPACE!",
    "style": {
        "background": "linear-gradient(...)",
        "primary_color": "#...",
        "special_effects": ["effect1", "effect2"]
    },
    "items": [
        "Item 1",
        "Item 2",
        ...
    ]
}
```

2. Add theme-specific CSS in `static/themes/`:
```css
/* static/themes/your-theme.css */
@import url('your-fonts-url');

:root {
    /* Theme colors */
}

/* Theme styles */
```

3. Test locally and deploy.

## AWS Deployment

1. Configure AWS credentials:
```bash
aws configure
```

2. Update configuration in `deploy.sh`:
```bash
STACK_NAME="your-stack-name"
DOMAIN_NAME="your-domain.com"
CERTIFICATE_ARN="your-certificate-arn"
```

3. Deploy:
```bash
chmod +x deploy.sh
./deploy.sh
```

### First-time Setup

1. Create an SSL certificate in AWS Certificate Manager
2. Create a Route53 hosted zone for your domain
3. Update your domain's nameservers to point to Route53

## Architecture

### Frontend
- HTML5, CSS3, JavaScript
- Responsive design using Tailwind CSS
- Custom animations and effects
- Client-side board generation

### Backend
- AWS Lambda functions (Python)
- API Gateway for RESTful endpoints
- S3 for static hosting
- CloudFront for content delivery

### Infrastructure
- AWS SAM for infrastructure as code
- WAF for security
- CloudWatch for monitoring
- Route53 for DNS management

## Customization

### Theme Customization
Modify files in:
- `bingo_items/` for content
- `static/themes/` for styling
- `static/js/effects.js` for special effects

### Infrastructure Customization
Modify:
- `template.yaml` for AWS resources
- `deploy.sh` for deployment settings

## Contributing

1. Fork the repository
2. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```
3. Commit changes:
```bash
git commit -m 'Add some feature'
```
4. Push to the branch:
```bash
git push origin feature/your-feature-name
```
5. Create a Pull Request

## Troubleshooting

### Common Issues

1. **PDF Generation Fails**
   - Check ReportLab installation
   - Verify Lambda memory settings
   - Check CloudWatch logs

2. **Special Effects Not Working**
   - Verify browser compatibility
   - Check console for errors
   - Ensure theme configuration is correct

3. **Deployment Failures**
   - Verify AWS credentials
   - Check S3 bucket naming
   - Validate CloudFormation template

### Debug Mode

Enable debug logging:
```javascript
// static/js/logger.js
const DEBUG = true;
```

### Logs

- Development: Check Flask server output
- Production: Check CloudWatch logs
  ```bash
  aws logs get-log-events --log-group-name /aws/lambda/your-function
  ```

## Security

- WAF protection enabled
- HTTPS enforced
- Rate limiting implemented
- CORS configured
- CSP headers set

## Performance

- CloudFront caching
- Image optimization
- Code minification
- Lazy loading
- Browser caching

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support:
1. Check the troubleshooting guide
2. Open an issue
3. Contact the maintainers

---

For more information about the infrastructure, see [INFRASTRUCTURE.md](INFRASTRUCTURE.md)

