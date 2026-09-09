const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { readUsage } = require('../usage');

describe('Usage Tracker & Parser', () => {
  test('readUsage returns properly structured usage object', async () => {
    const usage = await readUsage();
    assert.ok(usage);
    assert.equal(typeof usage.totalTokens, 'number');
    assert.equal(typeof usage.inputTokens, 'number');
    assert.equal(typeof usage.cachedTokens, 'number');
    assert.equal(typeof usage.outputTokens, 'number');
    assert.equal(typeof usage.turns, 'number');
    assert.ok(Array.isArray(usage.events));
    assert.ok(usage.providers);
    assert.ok(usage.providers.Codex);
    assert.ok(usage.providers['Claude Code / Cowork']);
    assert.ok(usage.providers.Antigravity);
  });

  test('aggregates non-zero events and prevents duplicate counts', async () => {
    // Test helper to verify parser behavior on mock log files if created in temporary directory
    const tempHome = path.join(os.tmpdir(), 'usage-test-' + Date.now());
    const codexSessionsDir = path.join(tempHome, '.codex', 'sessions');
    fs.mkdirSync(codexSessionsDir, { recursive: true });

    const now = new Date();
    const event1 = {
      type: 'event_msg',
      timestamp: now.toISOString(),
      payload: {
        type: 'token_count',
        info: {
          last_token_usage: {
            input_tokens: 1000,
            cached_input_tokens: 200,
            output_tokens: 300,
            reasoning_output_tokens: 50,
            total_tokens: 1550
          }
        }
      }
    };

    // Duplicate event (same timestamp and total_tokens)
    const logContent = JSON.stringify(event1) + '\n' + JSON.stringify(event1) + '\n';
    fs.writeFileSync(path.join(codexSessionsDir, 'session1.jsonl'), logContent);

    try {
      // Temporarily mock HOME/USERPROFILE
      const origHome = process.env.USERPROFILE || process.env.HOME;
      process.env.USERPROFILE = tempHome;
      process.env.HOME = tempHome;

      const usage = await readUsage();
      assert.equal(usage.providers.Codex.totalTokens, 1550, 'Duplicate log events should not be double-counted');
      assert.equal(usage.providers.Codex.turns, 1, 'Should record exactly 1 turn');
      assert.equal(usage.providers.Codex.inputTokens, 1000);
      assert.equal(usage.providers.Codex.cachedTokens, 200);
      assert.equal(usage.providers.Codex.outputTokens, 350); // 300 + 50 reasoning

      process.env.USERPROFILE = origHome;
      process.env.HOME = origHome;
    } finally {
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });

  test('parses Claude Code assistant events properly', async () => {
    const tempHome = path.join(os.tmpdir(), 'claude-usage-test-' + Date.now());
    const claudeProjectsDir = path.join(tempHome, '.claude', 'projects');
    fs.mkdirSync(claudeProjectsDir, { recursive: true });

    const now = new Date();
    const claudeEvent = {
      type: 'assistant',
      timestamp: now.toISOString(),
      message: {
        id: 'msg_12345',
        usage: {
          input_tokens: 500,
          cache_creation_input_tokens: 100,
          cache_read_input_tokens: 200,
          output_tokens: 150
        }
      }
    };

    fs.writeFileSync(path.join(claudeProjectsDir, 'project1.jsonl'), JSON.stringify(claudeEvent) + '\n');

    try {
      const origHome = process.env.USERPROFILE || process.env.HOME;
      process.env.USERPROFILE = tempHome;
      process.env.HOME = tempHome;

      const usage = await readUsage();
      const claudeProvider = usage.providers['Claude Code / Cowork'];
      assert.equal(claudeProvider.turns, 1);
      assert.equal(claudeProvider.inputTokens, 600); // 500 + 100 cache creation
      assert.equal(claudeProvider.cachedTokens, 200); // cache read
      assert.equal(claudeProvider.outputTokens, 150);
      assert.equal(claudeProvider.totalTokens, 950);

      process.env.USERPROFILE = origHome;
      process.env.HOME = origHome;
    } finally {
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });
});
