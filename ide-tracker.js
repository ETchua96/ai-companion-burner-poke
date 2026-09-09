const { execFile } = require('child_process');

let isTracking = false;
let trackTimer = null;
let lastHeartbeat = 0;
let onActiveHeartbeat = null;

let isChecking = false;

function checkIntelliJRunning() {
  if (process.platform !== 'win32') return Promise.resolve(false);
  if (isChecking) return Promise.resolve(false);
  isChecking = true;
  return new Promise((resolve) => {
    execFile('tasklist', ['/FI', 'IMAGENAME eq idea64.exe', '/FO', 'CSV', '/NH'], { timeout: 3000 }, (err, stdout) => {
      if (!err && stdout && stdout.includes('idea64.exe')) {
        isChecking = false;
        return resolve(true);
      }
      execFile('tasklist', ['/FI', 'IMAGENAME eq idea.exe', '/FO', 'CSV', '/NH'], { timeout: 3000 }, (err2, stdout2) => {
        isChecking = false;
        resolve(!err2 && Boolean(stdout2 && stdout2.includes('idea.exe')));
      });
    });
  });
}

function startIdeTracker({ intervalMs = 15000, onHeartbeat } = {}) {
  if (isTracking) return;
  isTracking = true;
  onActiveHeartbeat = onHeartbeat;
  lastHeartbeat = Date.now();

  trackTimer = setInterval(async () => {
    try {
      const isRunning = await checkIntelliJRunning();
      const now = Date.now();
      const deltaSec = Math.round((now - lastHeartbeat) / 1000);
      lastHeartbeat = now;

      if (isRunning && deltaSec > 0 && deltaSec <= 60) {
        if (typeof onActiveHeartbeat === 'function') {
          onActiveHeartbeat(deltaSec);
        }
      }
    } catch (_) {}
  }, intervalMs);
}

function stopIdeTracker() {
  isTracking = false;
  if (trackTimer) {
    clearInterval(trackTimer);
    trackTimer = null;
  }
}

module.exports = {
  checkIntelliJRunning,
  startIdeTracker,
  stopIdeTracker
};
