// server.js - Express + ws hub
import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
app.use(express.json());

const COMMAND_TOKEN = process.env.COMMAND_TOKEN || '';

function requireAuth(req, res, next) {
  if (!COMMAND_TOKEN) return next();
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token && token === COMMAND_TOKEN) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Keep clients map
const clients = new Map(); // clientId -> { ws, label, mru, lastSeen, platform, version }

// WebSocket server for clients
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  let clientId = null;
  let authed = !COMMAND_TOKEN; // if no token configured, accept

  ws.on('message', (buf) => {
    let msg;
    try { msg = JSON.parse(buf.toString()); } catch { return; }

    if (msg.kind === 'hello') {
      if (COMMAND_TOKEN && msg.token !== COMMAND_TOKEN) {
        try { ws.close(1008, 'Bad token'); } catch {}
        return;
      }
      authed = true;
      clientId = msg.clientId;
      clients.set(clientId, {
        ws,
        label: msg.label || '',
        mru: Array.isArray(msg.mru) ? msg.mru : [],
        lastSeen: Date.now(),
        platform: msg.platform || '',
        version: msg.version || ''
      });
      sendRosterUpdate();
      return;
    }
    if (!authed) return;

    // Update heartbeat and MRU
    if (msg.kind === 'hb') {
      const c = clients.get(clientId);
      if (c) c.lastSeen = Date.now();
      return;
    }
    if (msg.kind === 'mru') {
      const c = clients.get(clientId);
      if (c) { c.mru = msg.mru || c.mru; c.lastSeen = Date.now(); }
      return;
    }
    // Generic responses from client (acks, tabs)
    if (msg.kind) {
      // You could log or fan out to controller listeners here
      return;
    }
  });

  ws.on('close', () => {
    if (clientId) clients.delete(clientId);
    sendRosterUpdate();
  });
});

function sendRosterUpdate() {
  // (No-op broadcast to clients; controller UI polls via HTTP)
}

app.get('/api/clients', requireAuth, (_req, res) => {
  const list = [...clients.entries()].map(([id, c]) => ({
    clientId: id,
    label: c.label,
    lastSeen: c.lastSeen,
    online: true,
    platform: c.platform,
    version: c.version,
    mru: (c.mru || []).slice(0, 10)
  }));
  res.json({ clients: list });
});

app.post('/api/send', requireAuth, (req, res) => {
  const { target, command } = req.body || {};
  if (!command || !command.kind) {
    return res.status(400).json({ error: 'Missing command.kind' });
  }
  let targets = [];
  if (target === 'all') {
    targets = [...clients.values()];
  } else if (typeof target === 'string') {
    const c = clients.get(target);
    if (c) targets = [c];
  } else if (Array.isArray(target)) {
    targets = target.map(id => clients.get(id)).filter(Boolean);
  }
  if (!targets.length) return res.status(404).json({ error: 'No target clients found' });

  let sent = 0;
  for (const c of targets) {
    try { c.ws.send(JSON.stringify(command)); sent++; } catch {}
  }
  res.json({ ok: true, sent });
});

app.use(express.static('public'));

// simple health
app.get('/api/health', (_req,res)=>res.json({ ok:true, clients: clients.size }));

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Browser Commander server listening on http://127.0.0.1:${PORT}`);
  if (COMMAND_TOKEN) console.log('Auth token required for /api/* and client hello.');
});
