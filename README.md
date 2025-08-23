# Advanced Bot Tracking System

A sophisticated bot detection and user behavior analytics platform designed for cybersecurity research, phishing simulation, and social engineering analysis. The system operates under the guise of a legitimate resume optimization service while capturing comprehensive visitor data and behavior patterns.

## Tags

`cybersecurity` `bot-detection` `phishing-simulation` `social-engineering` `analytics` `tracking` `security-research` `honeypot` `behavioral-analysis` `threat-intelligence` `penetration-testing` `security-awareness` `fraud-detection` `web-security` `data-collection`

## Project Overview

<img width="1112" height="904" alt="Screenshot from 2025-08-01 23-12-54" src="https://github.com/user-attachments/assets/c7763213-e06f-4ddb-8117-51a163ca645f" />


This is a dual-purpose application that serves as:

1. **Front-end**: A convincing service that appears legitimate to end users
2. **Back-end**: A comprehensive bot tracking and user behavior analysis platform for security professionals

The system captures detailed information about every visitor, including IP addresses, user agents, browser fingerprints, interaction patterns, and behavioral indicators to distinguish between human users and automated bots.

## Core Features

### Bot Detection Engine
- **User Agent Analysis**: Identifies known bot signatures and suspicious patterns
- **Behavioral Scoring**: Calculates probability scores (0-100%) for bot classification
- **Header Analysis**: Examines HTTP headers for bot indicators
- **Interaction Tracking**: Monitors JavaScript execution and user interactions
- **Real-time Classification**: Instant human vs bot determination

### URL Obfuscation System
- **Friendly URLs**: `resumeboost-pro.up.railway.app/offer/professional-resume-boost-247`
- **Promo Code Style**: `resumeboost-pro.up.railway.app/promo/RESUME7432`
- **Company Application URLs**: `resumeboost-pro.up.railway.app/apply/google`
- **Tool-like Paths**: `resumeboost-pro.up.railway.app/tools/resume-optimizer`
- **Custom Path Support**: User-defined URL structures

### Analytics Dashboard
- **Campaign Management**: Organize tracking links by campaign and purpose
- **Visitor Analytics**: Detailed breakdown of each visitor interaction
- **Real-time Monitoring**: Live updates of visitor activity
- **Geographic Insights**: Language and location data analysis
- **Behavioral Patterns**: Scroll depth, time on page, interaction metrics

### Data Collection Capabilities
- **Network Information**: IP addresses, referrer data, connection details
- **Browser Fingerprinting**: Screen resolution, viewport, timezone, plugins
- **Device Information**: Platform, language settings, cookie support
- **Interaction Logging**: File uploads, form submissions, button clicks
- **Time-based Analytics**: Visit duration, scroll patterns, engagement metrics

## Technical Architecture

### Backend Infrastructure
- **Runtime**: Node.js with Express.js framework
- **Security**: Helmet.js security headers, CORS protection, rate limiting
- **Authentication**: Bearer token-based admin access
- **Data Storage**: In-memory with file system persistence
- **Logging**: Comprehensive interaction logging to JSON files

### Frontend Technologies
- **Interface**: Responsive HTML5 with CSS3 styling
- **JavaScript**: Vanilla JS for tracking and dashboard functionality
- **Icons**: Font Awesome icon library
- **Styling**: Gradient backgrounds, professional color schemes
- **Responsiveness**: Mobile and desktop optimized layouts

### Data Processing
- **Real-time Analytics**: Immediate processing of visitor data
- **Aggregation**: Campaign-level statistics and summaries
- **Export Capabilities**: JSON-formatted data extraction
- **Historical Analysis**: Time-series visitor data retention

## Installation and Deployment

### Prerequisites
- Node.js 18.0.0 or higher
- npm package manager
- Git version control
- Railway account (for cloud deployment)

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/planetsaint/bot-tracker.git
cd bot-tracker

# Install dependencies
npm install

# Set environment variables
export ADMIN_TOKEN=your-secure-admin-token
export PORT=3000

# Start the development server
npm start
```

### Railway Cloud Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Authenticate with Railway
railway login

# Initialize project
railway init bot-tracker

# Set environment variables
railway variables set ADMIN_TOKEN=your-secure-admin-token

# Deploy application
railway up
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ADMIN_TOKEN` | Authentication token for admin access | Yes | `admin-secret-token` |
| `PORT` | Server port number | No | `3000` |
| `DOMAIN` | Custom domain name | No | Railway-generated domain |
| `NODE_ENV` | Environment mode | No | `development` |

## Usage Instructions

### Administrative Access

1. Navigate to the dashboard: `https://your-domain.com/dashboard`
2. Enter the admin token in the authentication field
3. Click "Connect to Dashboard" to access admin features

### Creating Tracking Campaigns

1. Access the "Create Campaign" tab in the dashboard
2. Fill in campaign details:
   - **Description**: Campaign purpose (e.g., "Email Newsletter Test")
   - **Campaign Name**: Identifier for grouping (e.g., "Q1-2024")
   - **URL Type**: Select from friendly, promo, company, or tool URLs
   - **Custom Path**: Optional custom URL path
3. Click "Generate Tracking Link" to create the campaign
4. Copy the generated URLs for distribution

### Monitoring and Analytics

1. Switch to the "Campaign Analytics" tab
2. View overall statistics: total links, visits, bot detection rate
3. Click on individual campaign cards to expand detailed analytics
4. Review visitor logs with IP addresses, user agents, and bot classifications
5. Analyze user agent patterns and behavioral indicators

### URL Distribution Strategies

**Email Campaigns**
- Use promo code style URLs in marketing emails
- Embed in newsletter content with compelling call-to-action text
- Track email security system interactions vs human clicks

**Social Media**
- Share friendly URLs on social platforms
- Use company application URLs for recruitment-themed posts
- Monitor viral sharing patterns and bot engagement

**Phishing Simulations**
- Deploy tool-like URLs in security awareness training
- Test employee susceptibility to social engineering
- Measure response rates and behavioral differences

**Security Research**
- Analyze bot networks and automated crawling patterns
- Study user agent spoofing techniques
- Research geographic distribution of threats

## API Reference

### Authentication
All admin endpoints require Bearer token authentication:
```
Authorization: Bearer your-admin-token
```

### Endpoints

#### Health Check
```http
GET /health
```
Returns server status and uptime information.

#### Create Tracking Link
```http
POST /api/create-link
Content-Type: application/json
Authorization: Bearer token

{
  "description": "Campaign description",
  "campaign": "campaign-name",
  "urlType": "friendly|promo|company|tool",
  "customPath": "optional-custom-path"
}
```

#### Dashboard Data
```http
GET /api/dashboard
Authorization: Bearer token
```
Returns comprehensive dashboard statistics and campaign data.

#### Campaign Statistics
```http
GET /api/stats/:trackingId
Authorization: Bearer token
```
Returns detailed analytics for a specific campaign.

#### Tracking Endpoints
```http
GET /t/:trackingId
GET /offer/:friendlyPath
GET /promo/:promoCode
GET /apply/:companyName
```
Public tracking endpoints that capture visitor data.

## Data Structure

### Visitor Record
```json
{
  "timestamp": "2024-08-01T22:30:15.123Z",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "referer": "https://example.com",
  "acceptLanguage": "en-US,en;q=0.9",
  "acceptEncoding": "gzip, deflate, br",
  "isBot": false,
  "botScore": 15,
  "screen": {"width": 1920, "height": 1080},
  "viewport": {"width": 1200, "height": 800},
  "timezone": "America/New_York",
  "platform": "Win32"
}
```

### Campaign Metadata
```json
{
  "trackingId": "abc123def456...",
  "created": "2024-08-01T22:30:15.123Z",
  "description": "Email Newsletter Test",
  "campaign": "Q1-2024",
  "friendlyPath": "professional-resume-boost-247",
  "urlType": "friendly",
  "clicks": [],
  "totalClicks": 25,
  "uniqueIPs": 18,
  "botClicks": 7,
  "humanClicks": 18
}
```

## Bot Detection Algorithm

### Scoring Factors

**User Agent Analysis** (30 points maximum)
- Known bot keywords: python, curl, wget, selenium
- Missing or suspicious user agent strings
- Automated tool signatures

**Header Analysis** (45 points maximum)
- Missing accept-language header (20 points)
- Missing accept-encoding header (15 points)
- Missing accept header (10 points)

**Behavioral Indicators** (25 points maximum)
- Unusual header combinations
- Suspicious request patterns
- Lack of JavaScript execution

### Classification Thresholds
- **0-25 points**: Likely human user
- **26-50 points**: Suspicious, possible bot
- **51-75 points**: Likely automated tool
- **76-100 points**: Confirmed bot activity

## Security Considerations

### Data Protection
- Admin authentication required for all sensitive operations
- Rate limiting on administrative endpoints
- Input validation and sanitization
- Secure HTTP headers implementation

### Privacy Compliance
- No personally identifiable information stored beyond IP addresses
- Configurable data retention policies
- Transparent data collection practices
- Compliance with applicable privacy regulations

### Operational Security
- Secure token-based authentication
- Regular security header updates
- Input validation on all user inputs
- Protection against common web vulnerabilities

## Use Cases and Applications

### Cybersecurity Research
- Bot network analysis and characterization
- Automated threat intelligence collection
- Behavioral pattern recognition research
- Security tool effectiveness testing

### Penetration Testing
- Social engineering campaign assessment
- Employee security awareness evaluation
- Phishing simulation and training
- Attack vector identification

### Threat Intelligence
- Malicious actor behavior analysis
- Geographic threat distribution mapping
- Attack timing and pattern analysis
- Threat actor attribution research

### Security Awareness Training
- Employee phishing susceptibility testing
- Security behavior measurement
- Training effectiveness evaluation
- Risk assessment and reporting

## Troubleshooting

### Common Issues

**Authentication Failures**
- Verify admin token is correctly set in environment variables
- Check for extra spaces or special characters in token
- Ensure Bearer token format in API requests

**Data Not Appearing**
- Confirm tracking links are being accessed
- Check browser console for JavaScript errors
- Verify API endpoints are responding correctly

**Deployment Issues**
- Ensure all environment variables are properly configured
- Check deployment logs for error messages
- Verify Node.js version compatibility

### Debug Mode
Enable detailed logging by setting `NODE_ENV=development` for additional debug information.


### Security Reporting
Report security vulnerabilities through responsible disclosure practices. Do not publish security issues publicly.


## Disclaimer

This tool is designed for legitimate cybersecurity research, penetration testing, and security awareness training purposes. Users are responsible for ensuring compliance with applicable laws and regulations. Unauthorized use for malicious purposes is strictly prohibited.

## Support and Documentation

For additional support, implementation guidance, or feature requests, please refer to the project documentation or contact the development team through official channels.
