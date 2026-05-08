const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8080);
const stateFile = path.join(root, '.damas-pro-state.json');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 8 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function resolveUrl(url) {
  const clean = decodeURIComponent(url.split('?')[0]);
  if (clean === '/') return 'index.html';
  if (clean === '/admin') return 'admin.html';
  if (clean === '/cobrador-pro') return 'cobrador-pro.html';
  return clean.replace(/^\/+/, '');
}

http.createServer(async (req, res) => {
  if ((req.url || '').split('?')[0] === '/.netlify/functions/pro-state') {
    if (req.method === 'GET') {
      try {
        if (!fs.existsSync(stateFile)) return sendJson(res, 200, { state: null });
        return sendJson(res, 200, { state: JSON.parse(fs.readFileSync(stateFile, 'utf8')) });
      } catch (err) {
        return sendJson(res, 500, { error: err.message });
      }
    }

    if (req.method === 'POST') {
      try {
        const body = JSON.parse(await readBody(req) || '{}');
        if (!body.state || !body.state.version) return sendJson(res, 400, { error: 'Estado invalido' });
        fs.writeFileSync(stateFile, JSON.stringify(body.state, null, 2));
        return sendJson(res, 200, { ok: true });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const requested = resolveUrl(req.url || '/');
  const file = path.resolve(root, requested);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => {
  console.log(`Local server: http://localhost:${port}`);
});
