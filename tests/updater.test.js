const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  compareVersions,
  shouldCheckUpdate,
  createMasterServer,
  checkForUpdate,
  TWELVE_HOURS_MS
} = require('../updater');

describe('Auto-Update System', () => {
  describe('compareVersions', () => {
    test('detects newer version correctly', () => {
      assert.equal(compareVersions('0.4.8', '0.4.7'), 1);
      assert.equal(compareVersions('1.0.0', '0.4.8'), 1);
      assert.equal(compareVersions('0.5.0', '0.4.9'), 1);
      assert.equal(compareVersions('v0.4.8', '0.4.7'), 1);
      assert.equal(compareVersions('0.4.10', '0.4.9'), 1);
    });

    test('detects older version correctly', () => {
      assert.equal(compareVersions('0.4.7', '0.4.8'), -1);
      assert.equal(compareVersions('0.3.0', '0.4.0'), -1);
      assert.equal(compareVersions('0.4.8', 'v0.4.9'), -1);
    });

    test('detects identical versions', () => {
      assert.equal(compareVersions('0.4.8', '0.4.8'), 0);
      assert.equal(compareVersions('v0.4.8', '0.4.8'), 0);
      assert.equal(compareVersions('0.4.8', 'v0.4.8'), 0);
    });
  });

  describe('shouldCheckUpdate (12-Hour Schedule)', () => {
    test('returns true if no previous check was recorded', () => {
      assert.equal(shouldCheckUpdate(0, Date.now()), true);
      assert.equal(shouldCheckUpdate(null, Date.now()), true);
    });

    test('returns false if checked recently (within 12 hours)', () => {
      const now = Date.now();
      const fourHoursAgo = now - 4 * 60 * 60 * 1000;
      assert.equal(shouldCheckUpdate(fourHoursAgo, now), false);
    });

    test('returns true if checked 12 or more hours ago', () => {
      const now = Date.now();
      const twelveHoursAgo = now - TWELVE_HOURS_MS;
      const thirteenHoursAgo = now - 13 * 60 * 60 * 1000;
      assert.equal(shouldCheckUpdate(twelveHoursAgo, now), true);
      assert.equal(shouldCheckUpdate(thirteenHoursAgo, now), true);
    });
  });

  describe('Master Server & Client Update Checking', () => {
    let server;
    const testPort = 48189;
    const testMasterUrl = `http://127.0.0.1:${testPort}`;
    const testFilePath = path.join(__dirname, 'dummy_installer.exe');

    before(async () => {
      fs.writeFileSync(testFilePath, 'dummy executable content for test');
      server = await new Promise((resolve, reject) => {
        const s = createMasterServer({
          version: '0.4.8',
          getLatestFile: () => ({
            filePath: testFilePath,
            filename: 'Token Companion Setup 0.4.8.exe'
          })
        });
        s.once('error', reject);
        s.listen(testPort, '127.0.0.1', () => resolve(s));
      });
    });

    after(async () => {
      if (server) await new Promise(res => server.close(res));
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    });

    test('master /api/version returns version info', async () => {
      const res = await fetch(`${testMasterUrl}/api/version`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.version, '0.4.8');
      assert.equal(data.isMaster, true);
      assert.equal(data.filename, 'Token Companion Setup 0.4.8.exe');
      assert.equal(data.downloadUrl, '/api/update/download');
    });

    test('client detects updateAvailable when client version is older', async () => {
      const check = await checkForUpdate({ masterUrl: testMasterUrl, currentVersion: '0.4.7' });
      assert.equal(check.updateAvailable, true);
      assert.equal(check.latestVersion, '0.4.8');
      assert.equal(check.currentVersion, '0.4.7');
      assert.ok(check.downloadUrl.includes('/api/update/download'));
    });

    test('client detects no update when on the same or newer version', async () => {
      const check = await checkForUpdate({ masterUrl: testMasterUrl, currentVersion: '0.4.8' });
      assert.equal(check.updateAvailable, false);
      assert.equal(check.latestVersion, '0.4.8');
    });

    test('master /api/update/download streams file', async () => {
      const res = await fetch(`${testMasterUrl}/api/update/download`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.equal(text, 'dummy executable content for test');
    });

    test('downloadFile downloads file to disk with progress callback', async () => {
      const { downloadFile } = require('../updater');
      const dlPath = path.join(__dirname, 'downloaded_test.exe');
      let progressReported = false;
      await downloadFile(`${testMasterUrl}/api/update/download`, dlPath, (p) => {
        if (p.percent >= 0) progressReported = true;
      });
      assert.ok(fs.existsSync(dlPath));
      assert.equal(fs.readFileSync(dlPath, 'utf8'), 'dummy executable content for test');
      assert.ok(progressReported);
      fs.unlinkSync(dlPath);
    });

    test('findLatestInstaller locates the installer executable in dist or versions', () => {
      const { findLatestInstaller } = require('../updater');
      const found = findLatestInstaller(path.join(__dirname, '..'));
      assert.ok(found, 'Should find at least one built installer');
      assert.ok(found.filename.endsWith('.exe'));
      assert.ok(found.filePath.endsWith(found.filename));
    });

    test('findLatestInstaller prioritizes higher version over modification timestamp', () => {
      const { findLatestInstaller } = require('../updater');
      const tempDir = path.join(os.tmpdir(), 'updater-sort-test-' + Date.now());
      const distDir = path.join(tempDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });

      const fileOld = path.join(distDir, 'Token Companion Setup 0.4.10.exe');
      const fileNew = path.join(distDir, 'Token Companion Setup 0.4.11.exe');

      fs.writeFileSync(fileNew, 'v11');
      fs.writeFileSync(fileOld, 'v10');

      // Artificially make fileOld have a newer modification time
      const future = new Date(Date.now() + 60000);
      fs.utimesSync(fileOld, future, future);

      const chosen = findLatestInstaller(tempDir);
      assert.equal(chosen.filename, 'Token Companion Setup 0.4.11.exe');

      fs.rmSync(tempDir, { recursive: true, force: true });
    });
  });
});
