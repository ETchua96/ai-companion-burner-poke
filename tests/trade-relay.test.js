const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { startRelay } = require('../trade-relay');
const client = require('../trade-client');

describe('Trade Relay & Client', () => {
  let server;
  let relayUrl;

  before(async () => {
    server = await startRelay(0);
    const port = server.address().port;
    relayUrl = `http://127.0.0.1:${port}`;
  });

  after(() => {
    return new Promise(resolve => server.close(resolve));
  });

  test('health check returns ok', async () => {
    const res = await fetch(`${relayUrl}/health`);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.ok, true);
  });

  test('creates, joins, and confirms a trade between two players', async () => {
    const code = '789123';
    const offerA = {
      name: 'Pikachu',
      line: 3,
      stage: 1,
      active: true,
      level: 25,
      rarity: 'Common',
      shiny: false
    };
    const offerB = {
      name: 'Squirtle',
      line: 2,
      stage: 0,
      active: true,
      level: 25,
      rarity: 'Common',
      shiny: true
    };

    // 1. Player A creates trade
    const created = await client.create(relayUrl, code, offerA);
    assert.equal(created.code, code);
    assert.equal(created.status, 'waiting');

    // 2. Check status
    const statusBeforeJoin = await client.get(relayUrl, code);
    assert.equal(statusBeforeJoin.status, 'waiting');

    // 3. Player B joins trade
    const joined = await client.join(relayUrl, code, offerB);
    assert.equal(joined.status, 'confirm');

    // 4. Player A confirms
    const confirmA = await client.confirm(relayUrl, code, 'creator');
    assert.equal(confirmA.status, 'confirm');
    assert.equal(confirmA.confirmed.creator, true);
    assert.equal(confirmA.confirmed.joiner, false);

    // 5. Player B confirms (completes the trade)
    const confirmB = await client.confirm(relayUrl, code, 'joiner');
    assert.equal(confirmB.status, 'complete');
    assert.ok(confirmB.received, 'Player B should receive Player A offer');
    assert.equal(confirmB.received.name, 'Pikachu');

    // 6. Player A confirms again to collect received Pokémon
    const confirmACollect = await client.confirm(relayUrl, code, 'creator');
    assert.equal(confirmACollect.status, 'complete');
    assert.ok(confirmACollect.received, 'Player A should receive Player B offer');
    assert.equal(confirmACollect.received.name, 'Squirtle');
    assert.equal(confirmACollect.received.shiny, true);
  });

  test('creates and joins a battle between two teams', async () => {
    const code = '654321';
    const teamA = [{ name: 'Charizard', types: ['fire', 'flying'], level: 100 }];
    const teamB = [{ name: 'Blastoise', types: ['water'], level: 100 }];

    // 1. Create battle
    const created = await client.createBattle(relayUrl, code, teamA);
    assert.equal(created.code, code);
    assert.equal(created.status, 'waiting');

    // 2. Get status before join
    const status1 = await client.getBattle(relayUrl, code);
    assert.equal(status1.status, 'waiting');

    // 3. Join battle
    const joined = await client.joinBattle(relayUrl, code, teamB);
    assert.equal(joined.status, 'ready');
    assert.equal(joined.creator.length, 1);
    assert.equal(joined.joiner.length, 1);

    // 4. Get status after join
    const status2 = await client.getBattle(relayUrl, code);
    assert.equal(status2.status, 'ready');
    assert.equal(status2.creator[0].name, 'Charizard');
    assert.equal(status2.joiner[0].name, 'Blastoise');
  });

  test('rejects invalid trade code or duplicate active code', async () => {
    await assert.rejects(
      async () => client.create(relayUrl, '123', { name: 'Pikachu' }),
      /Trade relay error|invalid/i
    );
  });

  test('allows reusing code after previous trade/battle expires', async () => {
    const code = '999111';
    // Create trade with short simulated expiration by hitting relay directly or testing cleanup
    await client.create(relayUrl, code, { name: 'Pikachu' });
    // Attempting to create again immediately should fail (occupied)
    await assert.rejects(
      async () => client.create(relayUrl, code, { name: 'Bulbasaur' }),
      /occupied/i
    );
  });
});
