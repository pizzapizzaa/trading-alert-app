const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'db.json');

// ─── Security config ─────────────────────────────────────────────────────────

// Set ADMIN_API_SECRET in your environment to protect all API endpoints.
// Without it the server will warn on every request (intended for local dev only).
const API_SECRET = process.env.ADMIN_API_SECRET ?? '';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3001';

// Allowlists for input validation
const VALID_SYMBOLS = new Set(['XAU', 'XAG', 'XPT', 'XPD', 'oil']);
const VALID_CONDITIONS = new Set([
  'price_above', 'price_below',
  'change_percent_up', 'change_percent_down',
  'change_dollar_up', 'change_dollar_down',
]);

// ─── Simple in-memory rate limiter ───────────────────────────────────────────

const _rateCounts = new Map();
function rateLimiter(maxPerMinute) {
  return (req, res, next) => {
    const key = (req.ip ?? 'unknown') + ':' + Math.floor(Date.now() / 60_000);
    const count = (_rateCounts.get(key) ?? 0) + 1;
    _rateCounts.set(key, count);
    if (count === 1) setTimeout(() => _rateCounts.delete(key), 61_000);
    if (count > maxPerMinute) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireApiSecret(req, res, next) {
  if (!API_SECRET) {
    console.warn('[Auth] ADMIN_API_SECRET not set — all API requests allowed. Set it in production!');
    return next();
  }
  const auth = req.headers['authorization'] ?? '';
  if (auth !== `Bearer ${API_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function loadDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const init = { devices: [], alerts: [], history: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(init, null, 2));
      return init;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return { devices: [], alerts: [], history: [] };
  }
}

function saveDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Apply auth + rate limiting to all /api routes except device registration
// (device registration is called from the mobile app which cannot hold a server secret)
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' && req.path === '/devices/register') return next();
  requireApiSecret(req, res, next);
});
app.use('/api', rateLimiter(120));
app.use('/api/notify', rateLimiter(10));

// ─── Commodities ─────────────────────────────────────────────────────────────

const COMMODITIES = [
  { symbol: 'XAU', name: 'Gold',       yahooKey: 'GC=F', color: '#F5A623' },
  { symbol: 'XAG', name: 'Silver',     yahooKey: 'SI=F', color: '#A8A8A8' },
  { symbol: 'XPT', name: 'Platinum',   yahooKey: 'PL=F', color: '#E5E4E2' },
  { symbol: 'XPD', name: 'Palladium',  yahooKey: 'PA=F', color: '#9090A0' },
  { symbol: 'oil', name: 'Crude Oil',  yahooKey: 'CL=F', color: '#4A3224' },
];

// ─── Price fetching ───────────────────────────────────────────────────────────

let priceCache = { prices: null, fetchedAt: 0 };

async function fetchCurrentPrices() {
  try {
    const results = await Promise.allSettled(
      COMMODITIES.map(async (c) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(c.yahooKey)}?range=1d&interval=5m`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
        });
        const json = await res.json();
        const meta = json?.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
        const previousClose = meta?.previousClose ?? null;
        const change = price && previousClose ? price - previousClose : 0;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;
        return {
          symbol: c.symbol,
          name: c.name,
          color: c.color,
          price: price != null ? parseFloat(price.toFixed(2)) : null,
          change: parseFloat(change.toFixed(2)),
          changePercent: parseFloat(changePercent.toFixed(3)),
          lastUpdated: new Date().toISOString(),
        };
      })
    );
    return results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  } catch (err) {
    console.error('[Prices] Fetch failed:', err);
    return [];
  }
}

async function getPrices() {
  const now = Date.now();
  if (priceCache.prices && now - priceCache.fetchedAt < 30_000) {
    return priceCache.prices;
  }
  const prices = await fetchCurrentPrices();
  if (prices.length > 0) {
    priceCache = { prices, fetchedAt: now };
  }
  return prices || [];
}

// ─── Expo push notifications ──────────────────────────────────────────────────

async function sendExpoNotifications(tokens, title, body, data = {}) {
  if (!tokens.length) return { sent: 0, errors: [] };

  const messages = tokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    priority: 'high',
    sound: 'default',
  }));

  // Expo recommends batches of 100
  const chunks = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let sent = 0;
  const errors = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      const json = await res.json();
      for (const item of json.data ?? []) {
        if (item.status === 'ok') sent++;
        else errors.push(item.message ?? 'unknown error');
      }
    } catch (err) {
      errors.push(String(err));
    }
  }

  return { sent, errors };
}

// ─── Auto alert evaluation ────────────────────────────────────────────────────

async function evaluateAlerts() {
  const db = loadDb();
  const activeAlerts = db.alerts.filter((a) => a.active);
  if (!activeAlerts.length) return;

  const prices = await getPrices();
  if (!prices.length) return;

  const tokens = db.devices.map((d) => d.token);
  if (!tokens.length) return;

  let saved = false;

  for (const alert of activeAlerts) {
    const pd = prices.find((p) => p.symbol === alert.symbol);
    if (!pd || !pd.price) continue;

    const { price, change, changePercent } = pd;
    let triggered = false;
    let message = '';

    switch (alert.conditionType) {
      case 'price_above':
        if (price >= alert.targetValue) {
          triggered = true;
          message = `${pd.name} at $${price.toFixed(2)} — above target $${alert.targetValue}`;
        }
        break;
      case 'price_below':
        if (price <= alert.targetValue) {
          triggered = true;
          message = `${pd.name} at $${price.toFixed(2)} — below target $${alert.targetValue}`;
        }
        break;
      case 'change_percent_up':
        if (changePercent >= alert.targetValue) {
          triggered = true;
          message = `${pd.name} up ${changePercent.toFixed(2)}% (threshold +${alert.targetValue}%)`;
        }
        break;
      case 'change_percent_down':
        if (changePercent <= -Math.abs(alert.targetValue)) {
          triggered = true;
          message = `${pd.name} down ${Math.abs(changePercent).toFixed(2)}% (threshold ${alert.targetValue}%)`;
        }
        break;
      case 'change_dollar_up':
        if (change >= alert.targetValue) {
          triggered = true;
          message = `${pd.name} rose $${change.toFixed(2)} (threshold +$${alert.targetValue})`;
        }
        break;
      case 'change_dollar_down':
        if (change <= -Math.abs(alert.targetValue)) {
          triggered = true;
          message = `${pd.name} fell $${Math.abs(change).toFixed(2)} (threshold $${alert.targetValue})`;
        }
        break;
    }

    if (triggered) {
      const result = await sendExpoNotifications(tokens, `📊 ${alert.name}`, message, {
        alertId: alert.id,
        symbol: alert.symbol,
        price,
      });

      db.history.unshift({
        id: randomUUID(),
        alertId: alert.id,
        alertName: alert.name,
        symbol: alert.symbol,
        message,
        price,
        triggeredAt: new Date().toISOString(),
        sentTo: result.sent,
        source: 'auto',
      });
      console.log(`[AutoEval] Triggered "${alert.name}": ${message} → sent to ${result.sent} device(s)`);
      saved = true;
    }
  }

  if (saved) {
    db.history = db.history.slice(0, 200);
    saveDb(db);
  }
}

// Evaluate on startup and every 5 minutes
evaluateAlerts();
setInterval(evaluateAlerts, 5 * 60 * 1000);

// ─── API: Prices ─────────────────────────────────────────────────────────────

app.get('/api/prices', async (req, res) => {
  const prices = await getPrices();
  res.json(prices);
});

// ─── API: Devices ─────────────────────────────────────────────────────────────

app.get('/api/devices', (req, res) => {
  const db = loadDb();
  res.json(db.devices);
});

app.post('/api/devices/register', (req, res) => {
  const { token, platform, label } = req.body;
  if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
    return res.status(400).json({ error: 'Valid Expo push token required' });
  }

  const db = loadDb();
  const idx = db.devices.findIndex((d) => d.token === token);
  const now = new Date().toISOString();

  if (idx >= 0) {
    db.devices[idx] = { ...db.devices[idx], platform, label, lastSeen: now };
  } else {
    db.devices.push({
      id: randomUUID(),
      token,
      platform: platform ?? 'unknown',
      label: label ?? `${platform ?? 'Device'}`,
      registeredAt: now,
      lastSeen: now,
    });
    console.log(`[Devices] New device registered: ${platform} — ${token.slice(0, 40)}...`);
  }

  saveDb(db);
  res.json({ success: true });
});

app.delete('/api/devices/:id', (req, res) => {
  const db = loadDb();
  db.devices = db.devices.filter((d) => d.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// ─── API: Alerts ──────────────────────────────────────────────────────────────

app.get('/api/alerts', (req, res) => {
  const db = loadDb();
  res.json(db.alerts);
});

app.post('/api/alerts', (req, res) => {
  const { name, symbol, conditionType, targetValue } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  if (!VALID_SYMBOLS.has(symbol)) {
    return res.status(400).json({ error: `symbol must be one of: ${[...VALID_SYMBOLS].join(', ')}` });
  }
  if (!VALID_CONDITIONS.has(conditionType)) {
    return res.status(400).json({ error: `conditionType must be one of: ${[...VALID_CONDITIONS].join(', ')}` });
  }
  const parsed = parseFloat(targetValue);
  if (isNaN(parsed) || parsed <= 0) {
    return res.status(400).json({ error: 'targetValue must be a positive number' });
  }
  const db = loadDb();
  const alert = {
    id: randomUUID(),
    name: name.trim().slice(0, 80),
    symbol,
    conditionType,
    targetValue: parsed,
    active: true,
    createdAt: new Date().toISOString(),
  };
  db.alerts.push(alert);
  saveDb(db);
  res.status(201).json(alert);
});

app.put('/api/alerts/:id', (req, res) => {
  const db = loadDb();
  const idx = db.alerts.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Alert not found' });

  // Only allow specific fields to be updated (prevents mass-assignment)
  const patch = {};
  const { name, symbol, conditionType, targetValue, active } = req.body;
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Invalid name' });
    patch.name = name.trim().slice(0, 80);
  }
  if (symbol !== undefined) {
    if (!VALID_SYMBOLS.has(symbol)) return res.status(400).json({ error: 'Invalid symbol' });
    patch.symbol = symbol;
  }
  if (conditionType !== undefined) {
    if (!VALID_CONDITIONS.has(conditionType)) return res.status(400).json({ error: 'Invalid conditionType' });
    patch.conditionType = conditionType;
  }
  if (targetValue !== undefined) {
    const v = parseFloat(targetValue);
    if (isNaN(v) || v <= 0) return res.status(400).json({ error: 'Invalid targetValue' });
    patch.targetValue = v;
  }
  if (active !== undefined) patch.active = Boolean(active);

  db.alerts[idx] = { ...db.alerts[idx], ...patch };
  saveDb(db);
  res.json(db.alerts[idx]);
});

app.delete('/api/alerts/:id', (req, res) => {
  const db = loadDb();
  db.alerts = db.alerts.filter((a) => a.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

app.post('/api/alerts/:id/trigger', async (req, res) => {
  const db = loadDb();
  const alert = db.alerts.find((a) => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  const tokens = db.devices.map((d) => d.token);
  if (!tokens.length) return res.status(400).json({ error: 'No devices registered' });

  const prices = await getPrices();
  const pd = prices.find((p) => p.symbol === alert.symbol);
  const priceStr = pd?.price ? ` · Current: $${pd.price.toFixed(2)}` : '';
  const message = `Manual trigger: ${alert.name}${priceStr}`;

  const result = await sendExpoNotifications(tokens, `📊 ${alert.name}`, message, {
    alertId: alert.id,
    symbol: alert.symbol,
    manual: true,
  });

  db.history.unshift({
    id: randomUUID(),
    alertId: alert.id,
    alertName: alert.name,
    symbol: alert.symbol,
    message,
    price: pd?.price ?? null,
    triggeredAt: new Date().toISOString(),
    sentTo: result.sent,
    source: 'manual',
  });
  db.history = db.history.slice(0, 200);
  saveDb(db);

  res.json({ success: true, ...result });
});

// ─── API: Broadcast notification ──────────────────────────────────────────────

app.post('/api/notify', async (req, res) => {
  const { title, body, deviceIds, data } = req.body;
  if (!title?.trim() || !body?.trim()) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const db = loadDb();
  const tokens = deviceIds?.length
    ? db.devices.filter((d) => deviceIds.includes(d.id)).map((d) => d.token)
    : db.devices.map((d) => d.token);

  if (!tokens.length) return res.status(400).json({ error: 'No devices to send to' });

  const result = await sendExpoNotifications(tokens, title.trim(), body.trim(), data ?? {});

  db.history.unshift({
    id: randomUUID(),
    alertId: null,
    alertName: title.trim(),
    symbol: null,
    message: body.trim(),
    price: null,
    triggeredAt: new Date().toISOString(),
    sentTo: result.sent,
    source: 'broadcast',
  });
  db.history = db.history.slice(0, 200);
  saveDb(db);

  console.log(`[Broadcast] "${title}" → sent to ${result.sent}/${tokens.length} device(s)`);
  res.json({ success: true, ...result });
});

// ─── API: History ─────────────────────────────────────────────────────────────

app.get('/api/history', (req, res) => {
  const db = loadDb();
  res.json((db.history ?? []).slice(0, 100));
});

app.delete('/api/history', (req, res) => {
  const db = loadDb();
  db.history = [];
  saveDb(db);
  res.json({ success: true });
});

// ─── API: Stats ───────────────────────────────────────────────────────────────

app.get('/api/stats', (req, res) => {
  const db = loadDb();
  res.json({
    devices: db.devices.length,
    alerts: db.alerts.length,
    activeAlerts: db.alerts.filter((a) => a.active).length,
    notificationsSent: (db.history ?? []).reduce((sum, h) => sum + (h.sentTo ?? 0), 0),
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀  GoldTracker Admin running at http://localhost:${PORT}`);
  console.log(`📱  Set ADMIN_SERVER_URL in constants/adminConfig.ts to your local IP:${PORT}\n`);
  // Warm price cache
  getPrices().then((prices) => {
    if (prices.length) {
      console.log(`💰  Prices: ${prices.map((p) => `${p.name} $${p.price ?? 'N/A'}`).join(' | ')}`);
    }
  });
});
