const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN || 'resumeboost-pro.up.railway.app';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
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
}, 10000);

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
    const adjectives = [
        'free', 'instant', 'professional', 'premium', 'advanced', 'smart', 'quick', 'easy',
        'modern', 'expert', 'perfect', 'ultimate', 'powerful', 'enhanced', 'optimized'
    ];
    const nouns = [
        'resume', 'cv', 'career', 'job', 'interview', 'application', 'profile', 'skills',
        'boost', 'optimizer', 'builder', 'analyzer', 'scanner', 'checker', 'review'
    ];
    const actions = [
        'boost', 'optimize', 'enhance', 'improve', 'upgrade', 'analyze', 'review', 'scan',
        'check', 'build', 'create', 'polish', 'refine', 'perfect', 'maximize'
    ];
    
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    
    return adj + '-' + noun + '-' + action + '-' + num;
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
                    promoCode = 'RESUME' + Math.floor(Math.random() * 9000 + 1000);
                    break;
                case 'tool':
                    friendlyPath = 'tools/resume-optimizer';
                    break;
                case 'company':
                    const companies = ['google', 'microsoft', 'amazon', 'apple', 'meta', 'netflix', 'tesla', 'salesforce'];
                    const company = companies[Math.floor(Math.random() * companies.length)];
                    friendlyPath = 'apply/' + company;
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

// Function to generate resume optimizer HTML with enhanced tracking
function generateResumeOptimizerHTML(trackingId) {
    const enhancedTrackingScript = `
fetch("/api/js-track/${trackingId}", { 
    method: "POST", 
    headers: {"Content-Type": "application/json"}, 
    body: JSON.stringify({ 
        // Screen and display
        screen: {
            width: screen.width, 
            height: screen.height,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight
        },
        viewport: {
            width: window.innerWidth, 
            height: window.innerHeight
        },
        
        // Browser and system
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        language: navigator.language,
        languages: navigator.languages,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        
        // Canvas fingerprinting
        canvasFingerprint: (function() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                ctx.textBaseline = 'top';
                ctx.font = '14px Arial';
                ctx.fillText('fingerprint', 2, 2);
                return canvas.toDataURL().substring(0, 100);
            } catch(e) { return 'unavailable'; }
        })(),
        
        // WebGL info
        webglVendor: (function() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                const ext = gl.getExtension('WEBGL_debug_renderer_info');
                return gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
            } catch(e) { return 'unavailable'; }
        })(),
        
        // Performance metrics
        loadTime: performance.timing ? performance.timing.loadEventEnd - performance.timing.navigationStart : 0,
        
        // Document info
        pageUrl: window.location.href,
        referrer: document.referrer,
        title: document.title,
        timestamp: new Date().toISOString(),
        
        // Browser features
        hasTouch: 'ontouchstart' in window,
        hasWebRTC: !!window.RTCPeerConnection,
        hasWebGL: !!window.WebGLRenderingContext,
        hasWebWorker: !!window.Worker,
        
        // Plugins (limited in modern browsers)
        pluginsCount: navigator.plugins.length,
        
        // Connection info
        connection: navigator.connection ? {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
        } : null
    }) 
}).catch(() => {});

function startOptimization() { 
    fetch("/api/js-track/${trackingId}", { 
        method: "POST", 
        headers: {"Content-Type": "application/json"}, 
        body: JSON.stringify({ 
            action: "optimization_started", 
            timestamp: new Date().toISOString() 
        }) 
    }).catch(() => {}); 
    alert("Thank you for your interest! Please sign up for a free account to continue with the optimization process."); 
}`;

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ResumeBoost Pro - AI-Powered Resume Optimization</title><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet"><style>* { margin: 0; padding: 0; box-sizing: border-box; }body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }.header { background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 1rem 0; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 20px rgba(0,0,0,0.1); }.nav { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 2rem; }.logo { font-size: 1.8rem; font-weight: bold; color: #667eea; }.hero { text-align: center; padding: 4rem 2rem; color: white; }.hero h1 { font-size: 3.5rem; margin-bottom: 1rem; font-weight: 700; }.hero p { font-size: 1.3rem; margin-bottom: 2rem; opacity: 0.9; max-width: 600px; margin-left: auto; margin-right: auto; }.container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; }.upload-section { background: white; margin: 2rem auto; padding: 3rem; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); max-width: 800px; }.btn-primary { background: #667eea; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 50px; font-weight: 600; cursor: pointer; transition: all 0.3s; text-decoration: none; display: inline-block; }.btn-primary:hover { background: #5a6fd8; }</style></head><body><header class="header"><nav class="nav"><div class="logo"><i class="fas fa-file-alt"></i> ResumeBoost Pro</div></nav></header><section class="hero"><div class="container"><h1>Optimize Your Resume with AI</h1><p>Get your resume past ATS systems and into the hands of hiring managers. Our AI analyzes your resume against job requirements and optimizes it for maximum impact.</p></div></section><section class="upload-section"><div class="container"><h2 style="text-align: center; margin-bottom: 2rem; color: #333;">Upload Your Resume</h2><div style="border: 3px dashed #ddd; border-radius: 15px; padding: 3rem; text-align: center; background: #fafafa; margin: 2rem 0;"><i class="fas fa-cloud-upload-alt" style="font-size: 4rem; color: #667eea; margin-bottom: 1rem;"></i><h3>Drop your resume here or click to browse</h3><p>Supports PDF, DOC, DOCX formats (Max 10MB)</p><input type="file" style="margin: 1rem 0; padding: 0.75rem;" accept=".pdf,.doc,.docx"></div><div style="margin: 1.5rem 0;"><label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #555;">Target Job Title</label><input type="text" style="width: 100%; padding: 0.75rem; border: 2px solid #e0e6ff; border-radius: 10px;" placeholder="e.g., Software Engineer, Marketing Manager"></div><div style="text-align: center; margin: 2rem 0;"><button class="btn-primary" style="font-size: 1.1rem; padding: 1rem 3rem;" onclick="startOptimization()"><i class="fas fa-magic" style="margin-right: 0.5rem;"></i>Optimize My Resume</button></div></div></section><script>${enhancedTrackingScript}</script></body></html>`;
}

// Enhanced bot detection with more patterns
function detectBot(userAgent) {
    const botKeywords = [
        // Common bots
        'bot', 'crawler', 'spider', 'scraper', 'automated',
        // Programming languages and tools
        'python', 'curl', 'wget', 'requests', 'selenium',
        'headless', 'phantom', 'zombie', 'mechanize',
        // Additional bot indicators
        'http', 'client', 'fetch', 'node', 'java', 'ruby',
        'perl', 'go-http', 'postman', 'insomnia',
        // Security scanners
        'nmap', 'nikto', 'sqlmap', 'burp', 'zap'
    ];
    
    const ua = userAgent.toLowerCase();
    return botKeywords.some(keyword => ua.includes(keyword));
}

// Enhanced bot scoring with more factors
function calculateBotScore(headers) {
    let score = 0;
    
    // Missing headers (typical of bots)
    if (!headers['accept-language']) score += 20;
    if (!headers['accept-encoding']) score += 15;
    if (!headers['accept']) score += 10;
    if (!headers['referer'] && !headers['referrer']) score += 10;
    
    // User agent analysis
    const ua = (headers['user-agent'] || '').toLowerCase();
    if (ua.includes('python')) score += 30;
    if (ua.includes('curl')) score += 30;
    if (ua.includes('wget')) score += 30;
    if (ua === '') score += 25;
    if (ua.length < 20) score += 15;
    
    // Accept header analysis
    if (headers['accept'] && headers['accept'].includes('*/*') && !headers['accept-language']) {
        score += 15;
    }
    
    // Connection patterns
    if (headers['connection'] && headers['connection'].toLowerCase() === 'close') {
        score += 5;
    }
    
    // DNT header (Do Not Track) - bots often don't send this
    if (!headers['dnt']) score += 5;
    
    // Sec-Fetch headers (modern browsers send these)
    if (!headers['sec-fetch-mode'] && !headers['sec-fetch-site'] && !headers['sec-fetch-dest']) {
        score += 10;
    }
    
    return Math.min(score, 100);
}

// Generate browser fingerprint
function generateBrowserFingerprint(headers) {
    const components = [
        headers['user-agent'] || '',
        headers['accept'] || '',
        headers['accept-language'] || '',
        headers['accept-encoding'] || ''
    ];
    
    return crypto.createHash('md5').update(components.join('|')).digest('hex').substring(0, 16);
}

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
        accept: req.headers['accept'] || 'Unknown',
        host: req.headers['host'],
        method: req.method,
        url: req.url,
        query: req.query,
        
        // Additional headers
        dnt: req.headers['dnt'] || 'Not set',
        secFetchMode: req.headers['sec-fetch-mode'],
        secFetchSite: req.headers['sec-fetch-site'],
        secFetchDest: req.headers['sec-fetch-dest'],
        upgradeInsecureRequests: req.headers['upgrade-insecure-requests'],
        
        // Connection info
        protocol: req.protocol,
        secure: req.secure,
        httpVersion: req.httpVersion,
        
        // All forward headers
        xForwardedFor: req.headers['x-forwarded-for'],
        xRealIp: req.headers['x-real-ip'],
        cfConnectingIp: req.headers['cf-connecting-ip'],
        cfIpCountry: req.headers['cf-ipcountry'],
        cfRay: req.headers['cf-ray'],
        
        // Bot analysis
        isBot: detectBot(req.headers['user-agent'] || ''),
        botScore: calculateBotScore(req.headers),
        browserFingerprint: generateBrowserFingerprint(req.headers)
    };
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
    
    const strategy = req.query.strategy || 'resume';
    
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
            
        case 'resume':
        default:
            res.send(generateResumeOptimizerHTML(trackingId));
            break;
    }
}

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
    
    res.json({
        trackingId: trackingId,
        created: data.created,
        description: data.description,
        campaign: data.campaign,
        totalClicks: clicks.length,
        uniqueIPs: [...new Set(clicks.map(c => c.ip))].length,
        botClicks: clicks.filter(c => c.isBot).length,
        avgBotScore: clicks.length > 0 ? 
            clicks.reduce((sum, c) => sum + (c.botScore || 0), 0) / clicks.length : 0,
        recentClicks: clicks.slice(-10),
        topUserAgents: getTopUserAgents(clicks),
        clicksByHour: getClicksByHour(clicks)
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

// Export all data as CSV
app.get('/api/export/csv', requireAuth, (req, res) => {
    const csv = ['Timestamp,IP,UserAgent,IsBot,BotScore,Campaign,Description,Referrer'];
    
    trackingData.forEach((data, trackingId) => {
        data.clicks.forEach(click => {
            csv.push([
                click.timestamp,
                click.ip,
                `"${(click.userAgent || '').replace(/"/g, '""')}"`,
                click.isBot,
                click.botScore,
                data.campaign,
                data.description,
                click.referer || 'Direct'
            ].join(','));
        });
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="visitor-data.csv"');
    res.send(csv.join('\n'));
});

// Get detailed visitor profile
app.get('/api/visitor/:ip', requireAuth, (req, res) => {
    const targetIP = req.params.ip;
    const visits = [];
    
    trackingData.forEach((data, trackingId) => {
        const ipVisits = data.clicks.filter(click => click.ip === targetIP);
        ipVisits.forEach(visit => {
            visits.push({
                ...visit,
                campaign: data.campaign,
                trackingId: trackingId
            });
        });
    });
    
    res.json({
        ip: targetIP,
        totalVisits: visits.length,
        firstSeen: visits.length > 0 ? visits[visits.length - 1].timestamp : null,
        lastSeen: visits.length > 0 ? visits[0].timestamp : null,
        visits: visits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
});

// Enhanced dashboard HTML
app.get('/dashboard', (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>ResumeBoost Pro - Enhanced Analytics Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            min-height: 100vh;
            color: #333;
        }
        
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: 20px;
        }
        
        .main-card {
            background: white; 
            border-radius: 16px; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.1); 
            padding: 30px;
            margin-bottom: 20px;
        }
        
        h1 { 
            color: #667eea; 
            text-align: center; 
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        
        .auth { 
            background: #f8f9ff; 
            border-radius: 12px; 
            border: 2px solid #e0e6ff;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        input, select { 
            width: 100%; 
            padding: 14px; 
            margin: 10px 0; 
            border: 2px solid #e0e6ff; 
            border-radius: 8px; 
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        
        button { 
            background: #667eea; 
            color: white; 
            padding: 14px 28px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer; 
            font-weight: 600;
            font-size: 16px;
            transition: all 0.3s;
        }
        
        button:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
        
        .hidden { display: none; }
        
        .stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin: 30px 0; 
        }
        
        .stat { 
            background: linear-gradient(135deg, #667eea, #764ba2); 
            color: white; 
            padding: 25px; 
            border-radius: 12px; 
            text-align: center;
            transition: transform 0.3s;
        }
        
        .stat:hover {
            transform: translateY(-3px);
        }
        
        .stat h3 { 
            margin: 0; 
            font-size: 3em;
            font-weight: 700;
        }
        
        .stat p {
            margin-top: 5px;
            opacity: 0.9;
            font-size: 1.1em;
        }
        
        .tabs { 
            display: flex; 
            border-bottom: 2px solid #e0e6ff; 
            margin: 30px 0 20px 0;
            overflow-x: auto;
        }
        
        .tab { 
            padding: 12px 24px; 
            cursor: pointer; 
            border-bottom: 3px solid transparent;
            transition: all 0.3s;
            white-space: nowrap;
            font-weight: 500;
        }
        
        .tab.active { 
            border-bottom-color: #667eea; 
            color: #667eea; 
            font-weight: 600;
        }
        
        .tab:hover { 
            background: #f8f9ff;
        }
        
        .visitor-card {
            background: #fff;
            border: 2px solid #e0e6ff;
            border-radius: 12px;
            margin: 20px 0;
            overflow: hidden;
            transition: all 0.3s;
        }
        
        .visitor-card:hover {
            border-color: #667eea;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }
        
        .visitor-header {
            background: #f8f9ff;
            padding: 20px;
            border-bottom: 1px solid #e0e6ff;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .visitor-header:hover {
            background: #f0f4ff;
        }
        
        .visitor-main-info {
            flex: 1;
        }
        
        .visitor-timestamp {
            font-size: 1.2em;
            font-weight: 600;
            color: #667eea;
            margin-bottom: 8px;
        }
        
        .visitor-summary {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            color: #666;
        }
        
        .visitor-details {
            padding: 0;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
            background: #fafbff;
        }
        
        .visitor-details.show {
            max-height: 1000px;
            padding: 25px;
        }
        
        .detail-section {
            margin-bottom: 25px;
        }
        
        .detail-section h4 {
            color: #667eea;
            margin-bottom: 12px;
            font-size: 1.1em;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 15px;
        }
        
        .detail-item {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e0e6ff;
        }
        
        .detail-label {
            font-weight: 600;
            color: #555;
            font-size: 0.9em;
            margin-bottom: 4px;
        }
        
        .detail-value {
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            color: #333;
            word-break: break-all;
            font-size: 0.95em;
        }
        
        .bot-indicator {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        
        .bot-indicator.bot {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .bot-indicator.human {
            background: #d1fae5;
            color: #065f46;
        }
        
        .bot-indicator.suspicious {
            background: #fef3c7;
            color: #92400e;
        }
        
        .ip-badge {
            background: #e0e7ff;
            color: #4338ca;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
        }
        
        .location-badge {
            background: #fce7f3;
            color: #9f1239;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e0e6ff;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            transition: width 0.3s;
        }
        
        .error { color: #ef4444; }
        .success { color: #10b981; }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }
        
        .empty-state-icon {
            font-size: 4em;
            margin-bottom: 20px;
            opacity: 0.3;
        }
        
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .main-card { padding: 20px; }
            .stats { grid-template-columns: 1fr 1fr; }
            .detail-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="main-card">
            <h1>📊 ResumeBoost Pro Analytics</h1>
            <p class="subtitle">Advanced Visitor Tracking & Bot Detection System</p>
            
            <div class="auth">
                <h3>🔐 Authentication Required</h3>
                <input type="password" id="token" placeholder="Enter admin token" onkeypress="if(event.key==='Enter') authenticate()">
                <button onclick="authenticate()">🚀 Connect to Dashboard</button>
                <button onclick="refreshData()" id="refreshBtn" style="margin-left: 10px; background: #10b981; display: none;">🔄 Refresh</button>
                <button onclick="exportCSV()" id="exportBtn" style="margin-left: 10px; background: #ec4899; display: none;">📥 Export CSV</button>
                <div id="status" style="margin-top: 15px;"></div>
            </div>
            
            <div id="dashboard" class="hidden">
                <div class="stats">
                    <div class="stat">
                        <h3 id="totalLinks">0</h3>
                        <p>Campaign Links</p>
                    </div>
                    <div class="stat">
                        <h3 id="totalClicks">0</h3>
                        <p>Total Visits</p>
                    </div>
                    <div class="stat">
                        <h3 id="totalBots">0</h3>
                        <p>Bot Detections</p>
                    </div>
                    <div class="stat">
                        <h3 id="botPercentage">0%</h3>
                        <p>Bot Rate</p>
                    </div>
                </div>
                
                <div class="tabs">
                    <div class="tab active" onclick="showTab(this, 'visitors')">👥 Recent Visitors</div>
                    <div class="tab" onclick="showTab(this, 'campaigns')">📈 Campaign Analytics</div>
                    <div class="tab" onclick="showTab(this, 'create')">🔗 Create Campaign</div>
                </div>
                
                <div id="visitorsTab">
                    <h3 style="margin-bottom: 20px;">🕐 Live Visitor Feed</h3>
                    <div id="visitorsList">
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <p>Loading visitor data...</p>
                        </div>
                    </div>
                </div>
                
                <div id="campaignsTab" class="hidden">
                    <h3 style="margin-bottom: 20px;">📊 Campaign Performance</h3>
                    <div id="campaignsList">
                        <div class="empty-state">
                            <div class="empty-state-icon">📈</div>
                            <p>Loading campaigns...</p>
                        </div>
                    </div>
                </div>
                
                <div id="createTab" class="hidden">
                    <div style="background: #f8f9ff; padding: 25px; border-radius: 12px;">
                        <h3 style="margin-bottom: 20px;">🔗 Create New Campaign Link</h3>
                        <input type="text" id="description" placeholder="Campaign description (e.g., Email Newsletter - Q1 2024)">
                        <input type="text" id="campaign" placeholder="Campaign name (e.g., spring-promo-2024)">
                        <select id="urlType">
                            <option value="friendly">🌟 Friendly URL</option>
                            <option value="promo">🎁 Promo Code</option>
                            <option value="company">🏢 Company Application</option>
                            <option value="tool">🛠️ Tool URL</option>
                        </select>
                        <input type="text" id="customPath" placeholder="Custom path (optional, e.g., special-offer)">
                        <button onclick="createLink()" style="width: 100%; margin-top: 15px;">
                            ✨ Generate Tracking Link
                        </button>
                        <div id="result" style="margin-top: 20px;"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        let token = "";
        let allVisitors = [];
        let refreshInterval;
        
        function authenticate() {
            token = document.getElementById("token").value;
            fetch("/api/dashboard", {
                headers: { "Authorization": "Bearer " + token }
            })
            .then(r => r.ok ? r.json() : Promise.reject("Invalid token"))
            .then(data => {
                document.getElementById("status").innerHTML = '<span class="success">✅ Connected successfully!</span>';
                document.getElementById("dashboard").classList.remove("hidden");
                document.getElementById("refreshBtn").style.display = "inline-block";
                document.getElementById("exportBtn").style.display = "inline-block";
                updateDashboard(data);
                startAutoRefresh();
            })
            .catch(e => {
                document.getElementById("status").innerHTML = '<span class="error">❌ ' + e + '</span>';
            });
        }
        
        function startAutoRefresh() {
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(() => {
                if (token && !document.getElementById("dashboard").classList.contains("hidden")) {
                    refreshData();
                }
            }, 10000); // Refresh every 10 seconds
        }
        
        function refreshData() {
            if (!token) return;
            fetch("/api/dashboard", {
                headers: { "Authorization": "Bearer " + token }
            })
            .then(r => r.json())
            .then(data => updateDashboard(data))
            .catch(e => console.error("Refresh failed:", e));
        }
        
        function exportCSV() {
            if (!token) return;
            window.location.href = "/api/export/csv?token=" + token;
        }
        
        function updateDashboard(data) {
            // Update stats
            document.getElementById("totalLinks").textContent = data.totalLinks;
            document.getElementById("totalClicks").textContent = data.totalClicks;
            document.getElementById("totalBots").textContent = data.totalBots;
            document.getElementById("botPercentage").textContent = data.botPercentage + "%";
            
            // Collect all visitors from all campaigns
            allVisitors = [];
            data.links.forEach(link => {
                if (link.recentClicks && link.recentClicks.length > 0) {
                    link.recentClicks.forEach(click => {
                        allVisitors.push({
                            ...click,
                            campaign: link.campaign,
                            description: link.description,
                            trackingId: link.trackingId
                        });
                    });
                }
            });
            
            // Sort by timestamp (newest first)
            allVisitors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            // Update visitors list
            updateVisitorsList(allVisitors.slice(0, 50)); // Show last 50 visitors
            
            // Update campaigns list
            updateCampaignsList(data.links);
        }
        
        function updateVisitorsList(visitors) {
            const container = document.getElementById("visitorsList");
            
            if (visitors.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No visitors recorded yet.</p></div>';
                return;
            }
            
            container.innerHTML = visitors.map((visitor, index) => {
                const timeDiff = getTimeDifference(visitor.timestamp);
                const botClass = visitor.isBot ? 'bot' : (visitor.botScore > 50 ? 'suspicious' : 'human');
                const botIcon = visitor.isBot ? '🤖' : (visitor.botScore > 50 ? '🤔' : '👤');
                
                return \`
                    <div class="visitor-card">
                        <div class="visitor-header" onclick="toggleVisitor('visitor-\${index}')">
                            <div class="visitor-main-info">
                                <div class="visitor-timestamp">\${timeDiff}</div>
                                <div class="visitor-summary">
                                    <span class="ip-badge">\${visitor.ip || 'Unknown IP'}</span>
                                    <span class="bot-indicator \${botClass}">
                                        \${botIcon} \${visitor.isBot ? 'Bot' : (visitor.botScore > 50 ? 'Suspicious' : 'Human')} 
                                        (\${visitor.botScore || 0}%)
                                    </span>
                                    <span class="location-badge">📍 \${visitor.acceptLanguage || 'Unknown'}</span>
                                    <span style="color: #666;">Campaign: \${visitor.campaign}</span>
                                </div>
                            </div>
                            <div style="font-size: 1.5em; color: #667eea;">
                                \${visitor.data ? '📱' : '💻'}
                            </div>
                        </div>
                        <div class="visitor-details" id="visitor-\${index}">
                            \${formatVisitorDetails(visitor)}
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        function formatVisitorDetails(visitor) {
            let html = '';
            
            // Browser & System Info
            html += \`
                <div class="detail-section">
                    <h4>🌐 Browser & System</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">User Agent</div>
                            <div class="detail-value">\${visitor.userAgent || 'Not provided'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Accept Language</div>
                            <div class="detail-value">\${visitor.acceptLanguage || 'Not provided'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Accept Encoding</div>
                            <div class="detail-value">\${visitor.acceptEncoding || 'Not provided'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Referrer</div>
                            <div class="detail-value">\${visitor.referer || 'Direct'}</div>
                        </div>
                    </div>
                </div>
            \`;
            
            // JavaScript Data (if available)
            if (visitor.data) {
                const data = visitor.data;
                html += \`
                    <div class="detail-section">
                        <h4>📱 Device Information</h4>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <div class="detail-label">Screen Resolution</div>
                                <div class="detail-value">\${data.screen ? \`\${data.screen.width}x\${data.screen.height}\` : 'Unknown'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Viewport Size</div>
                                <div class="detail-value">\${data.viewport ? \`\${data.viewport.width}x\${data.viewport.height}\` : 'Unknown'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Timezone</div>
                                <div class="detail-value">\${data.timezone || 'Unknown'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Platform</div>
                                <div class="detail-value">\${data.platform || 'Unknown'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Language</div>
                                <div class="detail-value">\${data.language || 'Unknown'}</div>
                            </div>
                            <div class="detail-item">
                                <div class="detail-label">Canvas Fingerprint</div>
                                <div class="detail-value">\${data.canvasFingerprint ? data.canvasFingerprint.substring(0, 20) + '...' : 'Unknown'}</div>
                            </div>
                        </div>
                    </div>
                \`;
            }
            
            // Network Info
            html += \`
                <div class="detail-section">
                    <h4>🌍 Network Information</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">IP Address</div>
                            <div class="detail-value">\${visitor.ip || 'Unknown'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">X-Forwarded-For</div>
                            <div class="detail-value">\${visitor.xForwardedFor || 'Not provided'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">CF-Connecting-IP</div>
                            <div class="detail-value">\${visitor.cfConnectingIp || 'Not provided'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Request Method</div>
                            <div class="detail-value">\${visitor.method || 'GET'}</div>
                        </div>
                    </div>
                </div>
            \`;
            
            // Bot Analysis
            html += \`
                <div class="detail-section">
                    <h4>🤖 Bot Analysis</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <div class="detail-label">Bot Detection</div>
                            <div class="detail-value">\${visitor.isBot ? 'Detected as Bot' : 'Appears Human'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Bot Score</div>
                            <div class="detail-value">
                                \${visitor.botScore || 0}%
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: \${visitor.botScore || 0}%"></div>
                                </div>
                            </div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Campaign</div>
                            <div class="detail-value">\${visitor.campaign}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Tracking ID</div>
                            <div class="detail-value">\${visitor.trackingId.substring(0, 8)}...</div>
                        </div>
                    </div>
                </div>
            \`;
            
            return html;
        }
        
        function toggleVisitor(id) {
            const details = document.getElementById(id);
            details.classList.toggle('show');
        }
        
        function getTimeDifference(timestamp) {
            const now = new Date();
            const then = new Date(timestamp);
            const diff = now - then;
            
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days} day\${days > 1 ? 's' : ''} ago\`;
            if (hours > 0) return \`\${hours} hour\${hours > 1 ? 's' : ''} ago\`;
            if (minutes > 0) return \`\${minutes} minute\${minutes > 1 ? 's' : ''} ago\`;
            return \`\${seconds} second\${seconds !== 1 ? 's' : ''} ago\`;
        }
        
        function updateCampaignsList(links) {
            const container = document.getElementById("campaignsList");
            
            if (links.length === 0) {
                container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><p>No campaigns created yet.</p></div>';
                return;
            }
            
            container.innerHTML = links.map(link => {
                const humanRate = link.totalClicks > 0 ? 
                    Math.round((link.humanClicks / link.totalClicks) * 100) : 0;
                
                return \`
                    <div class="visitor-card">
                        <div class="visitor-header" onclick="toggleCampaign('campaign-\${link.trackingId}')">
                            <div class="visitor-main-info">
                                <div class="visitor-timestamp">\${link.description}</div>
                                <div class="visitor-summary">
                                    <span style="color: #666;">Campaign: \${link.campaign}</span>
                                    <span class="ip-badge">ID: \${link.shortId}</span>
                                    <span style="color: #666;">Created: \${new Date(link.created).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 2em; font-weight: bold; color: #667eea;">\${link.totalClicks}</div>
                                <div style="font-size: 0.9em; color: #666;">Total Clicks</div>
                            </div>
                        </div>
                        <div class="visitor-details" id="campaign-\${link.trackingId}">
                            <div class="detail-section">
                                <h4>📊 Campaign Metrics</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="detail-label">Total Clicks</div>
                                        <div class="detail-value">\${link.totalClicks}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Unique IPs</div>
                                        <div class="detail-value">\${link.uniqueIPs}</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Human Clicks</div>
                                        <div class="detail-value">\${link.humanClicks} (\${humanRate}%)</div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Bot Clicks</div>
                                        <div class="detail-value">\${link.botClicks} (\${100 - humanRate}%)</div>
                                    </div>
                                </div>
                            </div>
                            <div class="detail-section">
                                <h4>🔗 Campaign URLs</h4>
                                <div class="detail-grid">
                                    <div class="detail-item">
                                        <div class="detail-label">Main URL</div>
                                        <div class="detail-value" style="color: #667eea;">
                                            \${link.friendlyPath ? \`/offer/\${link.friendlyPath}\` : \`/t/\${link.trackingId}\`}
                                        </div>
                                    </div>
                                    <div class="detail-item">
                                        <div class="detail-label">Short URL</div>
                                        <div class="detail-value" style="color: #667eea;">
                                            /s/\${link.shortId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        function toggleCampaign(id) {
            const details = document.getElementById(id);
            details.classList.toggle('show');
        }
        
        function showTab(tabElement, tabName) {
            // Update active tab
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            tabElement.classList.add('active');
            
            // Show/hide tab content
            document.getElementById('visitorsTab').classList.toggle('hidden', tabName !== 'visitors');
            document.getElementById('campaignsTab').classList.toggle('hidden', tabName !== 'campaigns');
            document.getElementById('createTab').classList.toggle('hidden', tabName !== 'create');
            
            // Refresh data when switching to visitors or campaigns tab
            if ((tabName === 'visitors' || tabName === 'campaigns') && token) {
                refreshData();
            }
        }
        
        function createLink() {
            const desc = document.getElementById('description').value;
            const camp = document.getElementById('campaign').value;
            const urlType = document.getElementById('urlType').value;
            const customPath = document.getElementById('customPath').value;
            
            if (!desc || !camp) {
                alert('Please fill in both description and campaign name');
                return;
            }
            
            fetch('/api/create-link', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: desc,
                    campaign: camp,
                    urlType: urlType,
                    customPath: customPath
                })
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('result').innerHTML = \`
                        <div style="background: #d1fae5; border: 2px solid #6ee7b7; padding: 20px; border-radius: 8px;">
                            <strong style="color: #065f46; font-size: 1.1em;">✅ Campaign link created successfully!</strong>
                            <div style="margin-top: 15px; display: grid; gap: 10px;">
                                <div>
                                    <div style="font-weight: 600; color: #065f46; margin-bottom: 4px;">Main URL:</div>
                                    <div style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; word-break: break-all;">
                                        \${data.url}
                                    </div>
                                </div>
                                <div>
                                    <div style="font-weight: 600; color: #065f46; margin-bottom: 4px;">Short URL:</div>
                                    <div style="font-family: monospace; background: white; padding: 10px; border-radius: 4px; word-break: break-all;">
                                        \${data.shortUrl}
                                    </div>
                                </div>
                                <button onclick="copyToClipboard('\${data.url}')" style="background: #065f46; margin-top: 10px;">
                                    📋 Copy Main URL
                                </button>
                            </div>
                        </div>
                    \`;
                    
                    // Clear form
                    document.getElementById('description').value = '';
                    document.getElementById('campaign').value = '';
                    document.getElementById('customPath').value = '';
                    
                    // Refresh data after 10 second
                    setTimeout(refreshData, 10000);
                } else {
                    document.getElementById('result').innerHTML = \`
                        <div style="background: #fee2e2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px;">
                            <strong style="color: #dc2626;">❌ Error: \${data.error || 'Failed to create link'}</strong>
                        </div>
                    \`;
                }
            })
            .catch(e => {
                document.getElementById('result').innerHTML = \`
                    <div style="background: #fee2e2; border: 2px solid #fca5a5; padding: 20px; border-radius: 8px;">
                        <strong style="color: #dc2626;">❌ Error: \${e}</strong>
                    </div>
                \`;
            });
        }
        
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text).then(() => {
                alert('URL copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('URL copied to clipboard!');
            });
        }
        
        // Auto-focus on password field
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('token').focus();
        });
    </script>
</body>
</html>`);
});

// Short URL endpoint
app.get('/s/:shortId', (req, res) => {
    const shortId = req.params.shortId;
    let foundId = null;
    
    // Find full tracking ID from short ID
    for (const [trackingId, data] of trackingData.entries()) {
        if (trackingId.startsWith(shortId)) {
            foundId = trackingId;
            break;
        }
    }
    
    if (foundId) {
        handleTracking(req, res, foundId);
    } else {
        res.status(404).send('Link not found');
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Saving data before shutdown...');
    const dataObj = Object.fromEntries(trackingData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataObj, null, 2));
    process.exit(0);
});

app.listen(PORT, () => {
    console.log('🚀 ResumeBoost Pro running on port ' + PORT);
    console.log('🌐 Available at: https://resumeboost-pro.up.railway.app');
    console.log('📊 Dashboard: https://resumeboost-pro.up.railway.app/dashboard');
    console.log('🔐 Admin token: ' + (process.env.ADMIN_TOKEN || 'admin-secret-token'));
    console.log('📝 Total tracking links: ' + trackingData.size);
});
