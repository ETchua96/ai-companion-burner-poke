const http = require('http');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram');

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
const BEACON_PORT = 48088;

function parseVersionParts(v) {
  if (!v) return [0];
  const cleaned = String(v).trim().replace(/^v/i, '').split(/[-+]/)[0];
  return cleaned.split('.').map(n => parseInt(n, 10) || 0);
}

function compareVersions(a, b) {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function shouldCheckUpdate(lastCheckTimestamp, now = Date.now(), intervalMs = TWELVE_HOURS_MS) {
  if (!lastCheckTimestamp) return true;
  return (now - lastCheckTimestamp) >= intervalMs;
}

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(body));
}

function createMasterServer({ version, getLatestFile }) {
  return http.createServer((req, res) => {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    const pathname = req.url.split('?')[0];

    if (pathname === '/health') {
      return json(res, 200, { ok: true, role: 'master', version });
    }

    if (pathname === '/api/version') {
      const fileInfo = getLatestFile ? getLatestFile() : null;
      return json(res, 200, {
        ok: true,
        isMaster: true,
        name: 'Token Companion',
        version: version || '0.4.8',
        filename: fileInfo?.filename || 'Token Companion Setup.exe',
        downloadUrl: '/api/update/download',
        timestamp: Date.now()
      });
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/api/update/download') {
      const fileInfo = getLatestFile ? getLatestFile() : null;
      if (!fileInfo?.filePath || !fs.existsSync(fileInfo.filePath)) {
        return json(res, 404, { error: 'Update file not found' });
      }
      const stat = fs.statSync(fileInfo.filePath);
      res.writeHead(200, {
        'content-type': 'application/octet-stream',
        'content-length': stat.size,
        'content-disposition': `attachment; filename="${fileInfo.filename || 'Token Companion Setup.exe'}"`,
        'access-control-allow-origin': '*'
      });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(fileInfo.filePath).pipe(res);
    }

    return json(res, 404, { error: 'Not found' });
  });
}

async function checkForUpdate({ masterUrl, currentVersion }) {
  const url = masterUrl.replace(/\/+$/, '') + '/api/version';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const latestVersion = data.version;
    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
    const downloadUrl = data.downloadUrl.startsWith('http')
      ? data.downloadUrl
      : `${masterUrl.replace(/\/+$/, '')}${data.downloadUrl}`;

    return {
      ok: true,
      updateAvailable,
      latestVersion,
      currentVersion,
      filename: data.filename,
      downloadUrl,
      isMaster: Boolean(data.isMaster),
      masterUrl
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      ok: false,
      updateAvailable: false,
      currentVersion,
      error: err.message || String(err)
    };
  }
}

function startMasterBeacon({ version, port = 48080, beaconPort = BEACON_PORT }) {
  let socket = null;
  try {
    socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    socket.on('error', () => {
      try { socket.close(); } catch (_) {}
    });
    socket.bind(() => {
      try {
        socket.setBroadcast(true);
      } catch (_) {}
    });
  } catch (_) {
    return { stop: () => {} };
  }

  function broadcast() {
    if (!socket) return;
    const payload = Buffer.from(JSON.stringify({
      type: 'token-companion-master',
      version,
      port,
      timestamp: Date.now()
    }));
    socket.send(payload, 0, payload.length, beaconPort, '255.255.255.255', () => {});
  }

  // Immediate bursts on startup so clients active on the LAN detect the master opening immediately
  broadcast();
  const burst1 = setTimeout(broadcast, 400);
  const burst2 = setTimeout(broadcast, 1200);
  const interval = setInterval(broadcast, 30000);

  return {
    broadcastNow: broadcast,
    stop: () => {
      clearTimeout(burst1);
      clearTimeout(burst2);
      clearInterval(interval);
      try {
        socket?.close();
      } catch (_) {}
    }
  };
}

function startClientBeaconListener({ onMasterDetected, beaconPort = BEACON_PORT }) {
  let socket;
  try {
    socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  } catch (_) {
    return { close: () => {} };
  }

  socket.on('message', (msg, rinfo) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data && data.type === 'token-companion-master') {
        const masterUrl = `http://${rinfo.address}:${data.port || 48080}`;
        if (typeof onMasterDetected === 'function') {
          onMasterDetected({ masterUrl, version: data.version, timestamp: data.timestamp });
        }
      }
    } catch (_) {}
  });

  socket.on('error', () => {
    try { socket.close(); } catch (_) {}
  });

  try {
    socket.bind(beaconPort);
  } catch (_) {}

  return {
    close: () => {
      try { socket.close(); } catch (_) {}
    }
  };
}

function findLatestInstaller(appDir) {
  const searchDirs = [
    path.join(appDir, 'dist'),
    path.join(appDir, 'versions')
  ];

  let candidates = [];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.exe')) continue;
        if (file.includes('uninstaller') || file.includes('elevate')) continue;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        candidates.push({ filePath, filename: file, mtime: stat.mtimeMs });
      }
    } catch (_) {}
  }

  if (!candidates.length) return null;
  // Prioritize Setup installers, then by modification time
  candidates.sort((a, b) => {
    const aIsSetup = a.filename.includes('Setup');
    const bIsSetup = b.filename.includes('Setup');
    if (aIsSetup && !bIsSetup) return -1;
    if (!aIsSetup && bIsSetup) return 1;

    const aVerMatch = a.filename.match(/\d+\.\d+\.\d+/);
    const bVerMatch = b.filename.match(/\d+\.\d+\.\d+/);
    if (aVerMatch && bVerMatch) {
      const cmp = compareVersions(aVerMatch[0], bVerMatch[0]);
      if (cmp !== 0) return -cmp;
    }

    return b.mtime - a.mtime;
  });

  return candidates[0];
}

function downloadFile(url, targetPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    const client = url.startsWith('https') ? require('https') : require('http');
    client.get(url, res => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(targetPath, () => {});
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      let downloaded = 0;
      res.on('data', chunk => {
        downloaded += chunk.length;
        if (onProgress && total > 0) onProgress({ downloaded, total, percent: Math.round((downloaded / total) * 100) });
      });
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => {
        fs.unlink(targetPath, () => {});
        reject(err);
      });
    }).on('error', err => {
      fs.unlink(targetPath, () => {});
      reject(err);
    });
  });
}

module.exports = {
  TWELVE_HOURS_MS,
  BEACON_PORT,
  compareVersions,
  shouldCheckUpdate,
  createMasterServer,
  checkForUpdate,
  startMasterBeacon,
  startClientBeaconListener,
  findLatestInstaller,
  downloadFile
};
