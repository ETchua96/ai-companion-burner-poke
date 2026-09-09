// Minimal self-hosted relay for Token Companion trades.
// Standalone: node trade-relay.js 48080
const http = require('http');
const fs = require('fs');
const path = require('path');
const { findLatestInstaller } = require('./updater');
const pkg = require('./package.json');
const trades = new Map();
const battles = new Map();
const json = (response, status, body) => { response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); response.end(JSON.stringify(body)); };
const read = request => new Promise((resolve, reject) => { let body = ''; request.on('data', chunk => body += chunk); request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); } }); });
const safe = trade => trade && { code: trade.code, status: trade.status, expiresAt: trade.expiresAt, creator: trade.creator?.name, joiner: trade.joiner?.name, confirmed: trade.confirmed };
function createRelay() { return http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return json(response, 204, {});
  const parts = request.url.split('?')[0].split('/').filter(Boolean);
  try {
    if (request.method === 'GET' && parts[0] === 'health') return json(response, 200, { ok: true, version: pkg.version });
    if (request.method === 'GET' && parts[0] === 'api' && parts[1] === 'version') {
      const fileInfo = findLatestInstaller(__dirname);
      return json(response, 200, {
        ok: true,
        isMaster: true,
        name: 'Token Companion',
        version: pkg.version,
        filename: fileInfo?.filename || 'Token Companion Setup.exe',
        downloadUrl: '/api/update/download',
        timestamp: Date.now()
      });
    }
    if ((request.method === 'GET' || request.method === 'HEAD') && parts[0] === 'api' && parts[1] === 'update' && parts[2] === 'download') {
      const fileInfo = findLatestInstaller(__dirname);
      if (!fileInfo?.filePath || !fs.existsSync(fileInfo.filePath)) return json(response, 404, { error: 'Update file not found' });
      const stat = fs.statSync(fileInfo.filePath);
      response.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': stat.size,
        'content-disposition': `attachment; filename="${fileInfo.filename}"`,
        'access-control-allow-origin': '*'
      });
      if (request.method === 'HEAD') return response.end();
      return fs.createReadStream(fileInfo.filePath).pipe(response);
    }
    if (request.method === 'POST' && parts.length === 1 && parts[0] === 'battles') {
      const { code, team } = await read(request);
      const strCode = String(code);
      const existing = battles.get(strCode);
      if (existing && existing.expiresAt < Date.now()) battles.delete(strCode);
      if (!/^\d{6}$/.test(strCode) || !Array.isArray(team) || !team.length || battles.has(strCode)) return json(response, 400, { error: 'invalid or occupied battle code' });
      const battle = { code: strCode, creator: team.slice(0, 6), joiner: null, expiresAt: Date.now() + 10 * 60 * 1000 };
      battles.set(battle.code, battle);
      return json(response, 201, { code: battle.code, status: 'waiting', expiresAt: battle.expiresAt });
    }
    if (parts[0] === 'battles') { const battle = battles.get(parts[1]); if (!battle || battle.expiresAt < Date.now()) { battles.delete(parts[1]); return json(response, 404, { error: 'battle expired or not found' }); } if (request.method === 'GET') return json(response, 200, { code: battle.code, status: battle.joiner ? 'ready' : 'waiting', creator: battle.creator, joiner: battle.joiner }); if (request.method === 'POST' && parts[2] === 'join') { const { team } = await read(request); if (!Array.isArray(team) || !team.length || battle.joiner) return json(response, 409, { error: 'battle is unavailable' }); battle.joiner = team.slice(0, 6); return json(response, 200, { code: battle.code, status: 'ready', creator: battle.creator, joiner: battle.joiner }); } }
    if (request.method === 'POST' && parts.length === 1 && parts[0] === 'trades') {
      const { code, offer } = await read(request);
      const strCode = String(code);
      const existing = trades.get(strCode);
      if (existing && existing.expiresAt < Date.now()) trades.delete(strCode);
      if (!/^\d{6}$/.test(strCode) || !offer?.name || trades.has(strCode)) return json(response, 400, { error: 'invalid or occupied code' });
      const trade = { code: strCode, creator: offer, joiner: null, confirmed: { creator: false, joiner: false }, expiresAt: Date.now() + 10 * 60 * 1000, status: 'waiting' };
      trades.set(trade.code, trade);
      return json(response, 201, safe(trade));
    }
    const code = parts[1], trade = trades.get(code);
    if (!trade || trade.expiresAt < Date.now()) { trades.delete(code); return json(response, 404, { error: 'trade expired or not found' }); }
    if (request.method === 'GET' && parts.length === 2) return json(response, 200, safe(trade));
    if (request.method === 'POST' && parts[2] === 'join') { const { offer } = await read(request); if (!offer?.name || trade.joiner) return json(response, 409, { error: 'trade is unavailable' }); trade.joiner = offer; trade.status = 'confirm'; return json(response, 200, safe(trade)); }
    if (request.method === 'POST' && parts[2] === 'confirm') { const { side } = await read(request); if (!['creator', 'joiner'].includes(side) || !trade.joiner) return json(response, 400, { error: 'both offers are required' }); trade.confirmed[side] = true; if (trade.confirmed.creator && trade.confirmed.joiner) { trade.status = 'complete'; return json(response, 200, { ...safe(trade), received: side === 'creator' ? trade.joiner : trade.creator }); } return json(response, 200, safe(trade)); }
    return json(response, 404, { error: 'not found' });
  } catch { return json(response, 400, { error: 'bad request' }); }
}); }
function startRelay(port = 48080) { return new Promise((resolve, reject) => { const server = createRelay(); server.once('error', reject); server.listen(port, '0.0.0.0', () => { server.removeListener('error', reject); resolve(server); }); }); }
if (require.main === module) startRelay(Number(process.argv[2] || 48080)).then(() => console.log(`Token Companion trade relay listening on http://0.0.0.0:${process.argv[2] || 48080}`));
module.exports = { startRelay };
