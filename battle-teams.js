(() => {
  const byId = id => document.getElementById(id);
  const text = (en, zh) => (typeof language !== 'undefined' && language === 'zh-CN' ? zh : en);

  function moveControlsIntoBattle() {
    const controls = byId('saved-team-controls');
    const slots = byId('team-slots');
    if (controls && slots && controls.parentElement?.id !== 'battle') slots.after(controls);
  }

  let battleQuery = '';
  let battleType = 'all', battleShiny = 'all', battleLevel = 'all';
  const typeOptions = () => ['bug','dark','dragon','electric','fairy','fighting','fire','flying','ghost','grass','ground','ice','normal','poison','psychic','rock','steel','water'];
  const levelMatches = level => battleLevel === 'all' || (battleLevel === '1-20' && level <= 20) || (battleLevel === '21-50' && level >= 21 && level <= 50) || (battleLevel === '51-99' && level >= 51 && level <= 99) || (battleLevel === '100' && level >= 100);
  function installBattlePicker() {
    const picker = byId('battle-picker');
    if (!picker) return null;
    picker.style.display = 'none';
    let controls = byId('battle-picker-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'battle-picker-controls';
      controls.className = 'battle-picker-controls';
      picker.before(controls);
    }
    return controls;
  }

  function renderBattlePicker() {
    const controls = installBattlePicker();
    if (!controls || typeof state === 'undefined') return;
    const roster = typeof owned === 'function' ? owned() : [];
    const team = state.team || [];
    const query = battleQuery.trim().toLowerCase();
    const matches = roster.filter(mon => {
      const name = monName(mon).toLowerCase();
      const types = (lineFor(mon.line).types?.[monStage(mon)] || []).join(' ').toLowerCase();
      const matchesText = !query || name.includes(query) || String(monSpriteId(mon)) === query || types.includes(query);
      const matchesType = battleType === 'all' || types.split(' ').includes(battleType);
      const matchesShiny = battleShiny === 'all' || (battleShiny === 'shiny' && mon.shiny) || (battleShiny === 'normal' && !mon.shiny);
      return matchesText && matchesType && matchesShiny && levelMatches(mon.level || 100);
    });
    const addable = matches.filter(mon => !team.includes(mon.id));
    const cards = addable.map(mon => `<article class="battle-picker-card"><img src="${sprite(monSpriteId(mon), mon.shiny)}"><strong>${mon.shiny ? '✨ ' : ''}${monName(mon)}</strong><span>Lv.${mon.level || 100}</span><button type="button" class="battle-card-add" data-id="${mon.id}" ${team.length >= 6 ? 'disabled' : ''}>${text('Add', '加入')}</button></article>`).join('') || `<p class="muted">${text('No matching Pokémon available.', '没有可加入的匹配宝可梦。')}</p>`;
    controls.innerHTML = `<div class="filter-deck"><label><span>${text('Name or number', '名称或编号')}</span><input id="battle-picker-search" type="search" value="${battleQuery.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" placeholder="${text('Type to filter…', '输入筛选…')}"></label><label><span>${text('Type', '属性')}</span><select id="battle-picker-type"><option value="all">${text('All types', '全部属性')}</option>${typeOptions().map(type => `<option value="${type}">${type[0].toUpperCase() + type.slice(1)}</option>`).join('')}</select></label><label><span>${text('Shiny', '闪光')}</span><select id="battle-picker-shiny"><option value="all">${text('All', '全部')}</option><option value="shiny">${text('Shiny only', '仅闪光')}</option><option value="normal">${text('Non-shiny', '非闪光')}</option></select></label><label><span>${text('Level', '等级')}</span><select id="battle-picker-level"><option value="all">${text('All levels', '全部等级')}</option><option value="1-20">Lv. 1–20</option><option value="21-50">Lv. 21–50</option><option value="51-99">Lv. 51–99</option><option value="100">Lv. 100</option></select></label><span class="filter-count">${addable.length} ${text('available', '可加入')}</span></div><div class="battle-picker-card-grid">${cards}</div><div class="current-team-members">${team.length ? team.map(id => { const mon = roster.find(entry => String(entry.id) === String(id)); return mon ? `<button type="button" class="battle-member-remove" data-id="${mon.id}"><img src="${sprite(monSpriteId(mon), mon.shiny)}"><span>${mon.shiny ? '✨ ' : ''}${monName(mon)}<small>Lv.${mon.level || 100}</small></span><b>×</b></button>` : ''; }).join('') : `<span class="muted">${text('No Pokémon selected yet.', '尚未选择宝可梦。')}</span>`}</div>`;
    const search = byId('battle-picker-search');
    if (search) search.oninput = () => { battleQuery = search.value; renderBattlePicker(); };
    const typeSelect = byId('battle-picker-type'), shinySelect = byId('battle-picker-shiny'), levelSelect = byId('battle-picker-level');
    typeSelect.value = battleType; shinySelect.value = battleShiny; levelSelect.value = battleLevel;
    typeSelect.onchange = () => { battleType = typeSelect.value; renderBattlePicker(); };
    shinySelect.onchange = () => { battleShiny = shinySelect.value; renderBattlePicker(); };
    levelSelect.onchange = () => { battleLevel = levelSelect.value; renderBattlePicker(); };
    controls.querySelectorAll('.battle-card-add').forEach(button => button.onclick = async () => {
      await window.tokenCompanion.setTeam([...team, button.dataset.id]);
      await quickRefresh();
      renderBattlePicker();
    });
    controls.querySelectorAll('.battle-member-remove').forEach(button => button.onclick = async () => {
      await window.tokenCompanion.setTeam(team.filter(id => String(id) !== String(button.dataset.id)));
      await quickRefresh();
      renderBattlePicker();
    });
  }

  function renderSavedTeams() {
    moveControlsIntoBattle();
    const root = byId('saved-teams');
    if (!root || typeof state === 'undefined') return;
    const roster = typeof owned === 'function' ? owned() : [];
    const saved = Array.from({ length: 6 }, (_, slot) => state.savedTeams?.[slot] || []);
    const savedCount = saved.filter(team => team.length > 0).length;
    const count = byId('saved-team-count');
    if (count) count.textContent = `${savedCount} / 6`;
    root.innerHTML = saved.map((ids, slot) => {
      const members = ids.map(id => roster.find(mon => String(mon.id) === String(id))).filter(Boolean);
      const empty = members.length === 0;
      const preview = empty ? `<span class="muted">${text('No saved lineup', '暂无已保存队伍')}</span>` : members.map(mon => `<img title="${monName(mon)} Lv.${mon.level || 100}" src="${sprite(monSpriteId(mon), mon.shiny)}">`).join('');
      return `<article class="saved-team-card ${empty ? 'empty' : ''}"><strong>${text(`Team ${slot + 1}`, `队伍 ${slot + 1}`)}</strong><div class="saved-team-preview">${preview}</div><div class="saved-team-actions"><button type="button" class="save-team-slot" data-slot="${slot}" ${state.team?.length ? '' : 'disabled'}>${empty ? text('Save current', '保存当前队伍') : text('Overwrite', '覆盖保存')}</button><button type="button" class="load-team-slot" data-slot="${slot}" ${empty ? 'disabled' : ''}>${text('Load', '载入')}</button><button type="button" class="clear-team-slot danger" data-slot="${slot}" ${empty ? 'disabled' : ''}>${text('Clear', '清空')}</button></div></article>`;
    }).join('');

    root.querySelectorAll('.save-team-slot').forEach(button => button.onclick = async () => {
      try { await window.tokenCompanion.saveBattleTeam(Number(button.dataset.slot)); await quickRefresh(); renderSavedTeams(); }
      catch (error) { alert(error.message || String(error)); }
    });
    root.querySelectorAll('.load-team-slot').forEach(button => button.onclick = async () => {
      try { await window.tokenCompanion.loadBattleTeam(Number(button.dataset.slot)); await quickRefresh(); renderSavedTeams(); }
      catch (error) { alert(error.message || String(error)); }
    });
    root.querySelectorAll('.clear-team-slot').forEach(button => button.onclick = async () => {
      try { await window.tokenCompanion.clearSavedBattleTeam(Number(button.dataset.slot)); await quickRefresh(); renderSavedTeams(); }
      catch (error) { alert(error.message || String(error)); }
    });
    const clearCurrent = byId('clear-current-team');
    if (clearCurrent) {
      clearCurrent.textContent = text('Clear current team', '清空当前队伍');
      clearCurrent.disabled = !(state.team?.length);
      clearCurrent.onclick = async () => {
        await window.tokenCompanion.clearTeam();
        const result = byId('battle-result');
        if (result) result.textContent = text('Current battle team cleared.', '当前对战队伍已清空。');
        await quickRefresh();
        renderSavedTeams();
      };
    }
  }

  window.renderSavedTeams = renderSavedTeams;
  window.renderBattlePicker = renderBattlePicker;
  moveControlsIntoBattle();
  const slots = byId('team-slots');
  if (slots) new MutationObserver(() => { renderSavedTeams(); renderBattlePicker(); }).observe(slots, { childList: true });
})();
