const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, Notification, dialog } = require('electron');
const path = require('path');
const { readUsage } = require('./usage');
const { readState, applyUsage, hatchEgg, releaseEgg, claimFreeEgg, getEggClaimStatus, swapActive, swapEggToActive, replayCaught, setTeam, releaseCaught, createRemoteTrade, joinRemoteTrade, confirmRemoteTrade, remoteTradeStatus, createRemoteBattle, joinRemoteBattle, remoteBattleStatus, createTrade, claimTrade, resetCompanion, LINES, getTowerStatus, startTowerRun, battleTowerFloor, resetTowerRun, recordIdeActiveTime, verifyAdminCode, adminSetLevel, adminAddExp, adminForceEvolve, adminToggleShiny, adminSpawnEgg, adminResetEggCooldown, adminSpawnPokemon, adminHealTowerTeam, adminSetTowerFloor, adminResetState } = require('./companion');
const { autoBattle, PRACTICE_TIERS } = require('./battle');
const { getCatalog } = require('./catalog');
const { startRelay } = require('./trade-relay');
const { startIdeTracker, stopIdeTracker } = require('./ide-tracker');
const {
  TWELVE_HOURS_MS,
  shouldCheckUpdate,
  checkForUpdate,
  startMasterBeacon,
  startClientBeaconListener,
  downloadFile
} = require('./updater');
const pkg = require('./package.json');
const os = require('os');

let windowRef;
let tray;
let relayServer;
let masterBeacon = null;
let clientBeaconListener = null;
let updateCheckTimer = null;
let latestDiscoveredMaster = null;
let availableUpdate = null;

function isClientBinary() {
  const exe = (process.execPath || '').toLowerCase();
  return exe.includes('client') || process.env.TOKEN_COMPANION_ROLE === 'client';
}

function localAddress() { const entry = Object.values(os.networkInterfaces()).flat().find(item => item.family === 'IPv4' && !item.internal); return entry?.address || '127.0.0.1'; }
function settingsPath() { return path.join(app.getPath('userData'), 'settings.json'); }
function readSettings() {
  const isMasterDefault = !isClientBinary();
  try {
    const data = JSON.parse(require('fs').readFileSync(settingsPath(), 'utf8'));
    return {
      launchAtLogin: false,
      language: 'en',
      isMaster: isClientBinary() ? false : (typeof data.isMaster === 'boolean' ? data.isMaster : isMasterDefault),
      lastUpdateCheck: 0,
      ...data
    };
  } catch {
    return { launchAtLogin: false, language: 'en', isMaster: isMasterDefault, lastUpdateCheck: 0 };
  }
}
function writeSettings(settings) { require('fs').mkdirSync(path.dirname(settingsPath()), { recursive: true }); require('fs').writeFileSync(settingsPath(), JSON.stringify(settings, null, 2)); return settings; }
function setLaunchAtLogin(enabled) {
  const settings = writeSettings({ ...readSettings(), launchAtLogin: Boolean(enabled) });
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, path: process.execPath });
  if (tray) setupTrayMenu();
  return settings;
}
function setLanguage(language) {
  const settings = writeSettings({ ...readSettings(), language: language === 'zh-CN' ? 'zh-CN' : 'en' });
  if (windowRef) windowRef.setTitle(settings.language === 'zh-CN' ? '令牌伙伴' : 'Token Companion');
  if (tray) setupTrayMenu();
  return settings;
}
function labels() { return readSettings().language === 'zh-CN' ? { open: '打开令牌伙伴', refresh: '立即刷新', login: '登录 Windows 时启动', quit: '退出' } : { open: 'Open Token Companion', refresh: 'Refresh now', login: 'Launch at sign-in', quit: 'Quit' }; }

function createWindow() {
  windowRef = new BrowserWindow({
    width: 1040, height: 720, minWidth: 920, minHeight: 620,
    backgroundColor: '#0b1020', title: readSettings().language === 'zh-CN' ? '令牌伙伴' : 'Token Companion',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  windowRef.loadFile('index.html');
  windowRef.on('close', (event) => { if (!app.isQuiting) { event.preventDefault(); windowRef.hide(); } });
}

function showWindow() { if (!windowRef) createWindow(); windowRef.show(); windowRef.focus(); }

function setupTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'token-companion-pokedex.ico'));
  tray = new Tray(icon);
  tray.setToolTip('Token Companion — local Codex tracker');
  setupTrayMenu();
  tray.on('click', showWindow);
}
function setupTrayMenu() {
  const copy = labels();
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: copy.open, click: showWindow },
    { label: copy.refresh, click: () => windowRef?.webContents.send('refresh-requested') },
    { type: 'checkbox', label: copy.login, checked: readSettings().launchAtLogin, click: (item) => setLaunchAtLogin(item.checked) },
    { type: 'separator' },
    { label: copy.quit, click: () => { app.isQuiting = true; app.quit(); } }
  ]));
}

ipcMain.handle('snapshot', async () => {
  const usage = await readUsage();
  const before = readState();
  const beforeEggCount = (before.eggs || []).length, beforeCaughtCount = (before.caught || []).length;
  const state = applyUsage(before, usage);
  const chinese = readSettings().language === 'zh-CN';
  if (Notification.isSupported() && state.eggs.length > beforeEggCount) new Notification({ title: chinese ? '令牌伙伴' : 'Token Companion', body: chinese ? '一颗新蛋已加入蛋库存。' : 'A new egg has arrived in your inventory.' }).show();
  if (Notification.isSupported() && state.caught.length > beforeCaughtCount) new Notification({ title: chinese ? '令牌伙伴' : 'Token Companion', body: chinese ? '伙伴已毕业并加入图鉴！' : 'Your companion graduated into the Pokédex!' }).show();
  return { usage, state };
});
ipcMain.handle('catalog', () => getCatalog());
ipcMain.handle('get-state', () => readState());
ipcMain.handle('reset-companion', () => resetCompanion());
ipcMain.handle('replay-caught', (_, id) => replayCaught(id));
ipcMain.handle('hatch-egg', (_, id) => hatchEgg(id));
ipcMain.handle('release-egg', (_, id) => releaseEgg(id));
ipcMain.handle('swap-active', (_, id) => swapActive(id));
ipcMain.handle('swap-egg-to-active', (_, id) => swapEggToActive(id));
ipcMain.handle('confirm', async (_, opts) => {
  const win = BrowserWindow.getFocusedWindow() || windowRef;
  const res = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: [opts.confirmText || 'Yes', opts.cancelText || 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    title: opts.title || 'Token Companion',
    message: opts.message || ''
  });
  return res.response === 0;
});
ipcMain.handle('set-team', (_, ids) => setTeam(ids));
ipcMain.handle('release-caught', (_, id, force) => releaseCaught(id, force));
ipcMain.handle('claim-free-egg', () => claimFreeEgg());
ipcMain.handle('egg-claim-status', () => getEggClaimStatus());
ipcMain.handle('create-trade', (_, id) => createTrade(id));
ipcMain.handle('claim-trade', (_, code, id) => claimTrade(code, id));
ipcMain.handle('remote-trade-create', (_, id, relayUrl) => createRemoteTrade(id, relayUrl));
ipcMain.handle('remote-trade-join', (_, code, id, relayUrl) => joinRemoteTrade(code, id, relayUrl));
ipcMain.handle('remote-trade-confirm', (_, code, relayUrl) => confirmRemoteTrade(code, relayUrl));
ipcMain.handle('remote-trade-status', (_, code, relayUrl) => remoteTradeStatus(code, relayUrl));
ipcMain.handle('remote-battle-create', (_, relayUrl) => createRemoteBattle(relayUrl));
ipcMain.handle('remote-battle-join', (_, code, relayUrl) => joinRemoteBattle(code, relayUrl));
ipcMain.handle('remote-battle-status', (_, code, relayUrl) => remoteBattleStatus(code, relayUrl));
ipcMain.handle('start-trade-relay', async () => { if (!relayServer) relayServer = await startRelay(48080); return `http://${localAddress()}:48080`; });
ipcMain.handle('auto-battle', (_, opponentOrTier) => {
  const state = readState();
  const mine = state.team.map(id => state.caught.find(mon => mon.id === id)).filter(Boolean).map(mon => {
    const line = typeof mon.line === 'number' ? LINES[mon.line] : mon.line;
    const stage = typeof mon.stage === 'number' ? mon.stage : (line.finalStage ?? (line.labels.length - 1));
    return { name: line.labels[stage], types: line.types?.[stage] || ['normal'], level: mon.level || 100, shiny: Boolean(mon.shiny) };
  });
  let opponent = opponentOrTier;
  if (typeof opponentOrTier === 'string' && PRACTICE_TIERS[opponentOrTier]) {
    opponent = PRACTICE_TIERS[opponentOrTier].team;
  }
  return mine.length && Array.isArray(opponent) && opponent.length ? autoBattle(mine, opponent.slice(0, 6)) : null;
});
ipcMain.handle('get-practice-tiers', () => PRACTICE_TIERS);
ipcMain.handle('tower-status', () => getTowerStatus());
ipcMain.handle('tower-start', () => startTowerRun());
ipcMain.handle('tower-battle', () => battleTowerFloor());
ipcMain.handle('tower-reset', () => resetTowerRun());
ipcMain.handle('settings', () => readSettings());
ipcMain.handle('set-launch-at-login', (_, enabled) => setLaunchAtLogin(enabled));
ipcMain.handle('set-language', (_, language) => setLanguage(language));
ipcMain.handle('notify', (_, title, body) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
});
let currentAdminMode = null;
ipcMain.handle('verify-admin-code', (_, code) => {
  const res = verifyAdminCode(code);
  currentAdminMode = res.mode;
  return res;
});
ipcMain.handle('admin-action', async (_, action, payload = {}) => {
  if (!currentAdminMode) throw new Error('Admin mode is locked.');
  if (currentAdminMode === 'limited') {
    const isAllowed =
      (action === 'add-exp' && (Number(payload.amount) || 0) <= 10000) ||
      action === 'force-evolve' ||
      action === 'spawn-egg';
    if (!isAllowed) {
      throw new Error('Action not permitted in limited admin mode.');
    }
  }
  switch (action) {
    case 'set-level':
      adminSetLevel(payload.level);
      break;
    case 'add-exp':
      adminAddExp(currentAdminMode === 'limited' ? Math.min(10000, Math.max(0, payload.amount)) : payload.amount);
      break;
    case 'force-evolve':
      adminForceEvolve();
      break;
    case 'toggle-shiny':
      adminToggleShiny();
      break;
    case 'spawn-egg':
      adminSpawnEgg(payload.group, currentAdminMode === 'limited' ? false : payload.shiny);
      break;
    case 'reset-egg-cooldown':
      adminResetEggCooldown();
      break;
    case 'spawn-pokemon':
      adminSpawnPokemon(payload);
      break;
    case 'heal-tower':
      adminHealTowerTeam();
      break;
    case 'set-tower-floor':
      adminSetTowerFloor(payload.floor);
      break;
    case 'reset-state':
      adminResetState();
      break;
    default:
      throw new Error(`Unknown admin action: ${action}`);
  }
  return { ok: true, state: readState() };
});

async function performUpdateCheck(masterUrl, reason) {
  const settings = readSettings();
  if (settings.isMaster) return { ok: true, isMaster: true, currentVersion: pkg.version };
  const targetUrl = masterUrl || latestDiscoveredMaster || settings.masterUrl || `http://${localAddress()}:48080`;
  writeSettings({ ...settings, lastUpdateCheck: Date.now() });

  const result = await checkForUpdate({
    masterUrl: targetUrl,
    currentVersion: pkg.version
  });

  if (result.ok && result.updateAvailable) {
    availableUpdate = result;
    if (windowRef && !windowRef.isDestroyed()) {
      windowRef.webContents.send('update-available', result);
    }
    if (Notification.isSupported()) {
      new Notification({
        title: settings.language === 'zh-CN' ? '发现新版本' : 'Token Companion Update',
        body: settings.language === 'zh-CN'
          ? `Master 已上线，最新版本 v${result.latestVersion} 可更新！`
          : `Master is online! Latest version v${result.latestVersion} is available to update.`
      }).show();
    }
  }
  return result;
}

async function setupAutoUpdate() {
  const settings = readSettings();
  if (settings.isMaster) {
    if (!relayServer) {
      try { relayServer = await startRelay(48080); } catch (_) {}
    }
    if (clientBeaconListener) {
      clientBeaconListener.close();
      clientBeaconListener = null;
    }
    if (masterBeacon) masterBeacon.stop();
    masterBeacon = startMasterBeacon({ version: pkg.version, port: 48080 });
  } else {
    if (masterBeacon) {
      masterBeacon.stop();
      masterBeacon = null;
    }
    if (clientBeaconListener) clientBeaconListener.close();
    clientBeaconListener = startClientBeaconListener({
      onMasterDetected: async ({ masterUrl }) => {
        latestDiscoveredMaster = masterUrl;
        await performUpdateCheck(masterUrl, 'master-online');
      }
    });

    if (shouldCheckUpdate(settings.lastUpdateCheck)) {
      await performUpdateCheck(settings.masterUrl || `http://${localAddress()}:48080`, 'startup-or-12h');
    }

    if (updateCheckTimer) clearInterval(updateCheckTimer);
    updateCheckTimer = setInterval(async () => {
      await performUpdateCheck(latestDiscoveredMaster || settings.masterUrl || `http://${localAddress()}:48080`, '12h-schedule');
    }, TWELVE_HOURS_MS);
  }
}

ipcMain.handle('check-for-update', (_, manualUrl) => performUpdateCheck(manualUrl, 'manual'));
ipcMain.handle('set-master-mode', (_, isMaster) => {
  const settings = writeSettings({ ...readSettings(), isMaster: Boolean(isMaster) });
  setupAutoUpdate();
  return settings;
});
ipcMain.handle('get-updater-status', () => {
  const s = readSettings();
  return {
    isMaster: Boolean(s.isMaster),
    currentVersion: pkg.version,
    lastUpdateCheck: s.lastUpdateCheck || 0,
    masterUrl: latestDiscoveredMaster || s.masterUrl || `http://${localAddress()}:48080`,
    availableUpdate
  };
});
ipcMain.handle('apply-update', async (_, downloadUrl, filename) => {
  const url = downloadUrl || availableUpdate?.downloadUrl;
  const fn = filename || availableUpdate?.filename || `Token Companion Setup ${availableUpdate?.latestVersion || 'latest'}.exe`;
  if (!url) throw new Error('No update URL provided');
  const tempDir = app.getPath('temp');
  const targetPath = path.join(tempDir, fn);

  await downloadFile(url, targetPath, (progress) => {
    if (windowRef && !windowRef.isDestroyed()) {
      windowRef.webContents.send('update-download-progress', progress);
    }
  });

  const { spawn } = require('child_process');
  const isInstaller = fn.toLowerCase().includes('setup');
  const args = isInstaller ? ['/S'] : [];
  spawn(targetPath, args, { detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => app.quit(), 800);
  return { ok: true, targetPath };
});

app.whenReady().then(() => {
  app.setLoginItemSettings({ openAtLogin: readSettings().launchAtLogin, path: process.execPath });
  createWindow();
  setupTray();
  setupAutoUpdate();
  startIdeTracker({
    intervalMs: 15000,
    onHeartbeat: (deltaSec) => {
      recordIdeActiveTime(deltaSec);
    }
  });
});
app.on('window-all-closed', (event) => event.preventDefault());
app.on('before-quit', () => {
  stopIdeTracker();
  if (masterBeacon) masterBeacon.stop();
  if (clientBeaconListener) clientBeaconListener.close();
  if (updateCheckTimer) clearInterval(updateCheckTimer);
});
