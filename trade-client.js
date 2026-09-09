function base(url) { return String(url || '').replace(/\/+$/, ''); }
async function request(url, method, body) { const response = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Trade relay error'); return data; }
function create(url, code, offer) { return request(base(url) + '/trades', 'POST', { code, offer }); }
function get(url, code) { return request(base(url) + '/trades/' + code, 'GET'); }
function join(url, code, offer) { return request(base(url) + '/trades/' + code + '/join', 'POST', { offer }); }
function confirm(url, code, side) { return request(base(url) + '/trades/' + code + '/confirm', 'POST', { side }); }
function createBattle(url, code, team) { return request(base(url) + '/battles', 'POST', { code, team }); }
function getBattle(url, code) { return request(base(url) + '/battles/' + code, 'GET'); }
function joinBattle(url, code, team) { return request(base(url) + '/battles/' + code + '/join', 'POST', { team }); }
module.exports = { create, get, join, confirm, createBattle, getBattle, joinBattle };
