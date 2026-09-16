(() => {
  const byId = id => document.getElementById(id);
  const text = (en, zh) => (typeof language !== 'undefined' && language === 'zh-CN' ? zh : en);

  function moveControlsIntoBattle() {
    const controls = byId('saved-team-controls');
    const slots = byId('team-slots');
    if (controls && slots && controls.parentElement?.id !== 'battle') slots.after(controls);
  }

  let battleQuery = '';
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
      return !query || name.includes(query) || String(monSpriteId(mon)) === query;
    });
    const addable = matches.filter(mon => !team.includes(mon.id));
    controls.innerHTML = `<label><span>${text('Search Inventory', '搜索库存')}</span><input id="battle-picker-search" type="search" value="${battleQuery.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" placeholder="${text('Pokémon name or number', '宝可梦名称或编号')}"></label><div class="battle-picker-row"><label><span>${text('Choose Pokémon', '选择宝可梦')}</span><select id="battle-picker-select"><option value="">${text('Choose from inventory…', '从库存中选择…')}</option>${addable.map(mon => `<option value="${mon.id}">${mon.shiny ? '✨ ' : ''}${monName(mon)} · Lv.${mon.level || 100}</option>`).join('')}</select></label><button type="button" id="battle-picker-add" ${!addable.length || team.length >= 6 ? 'disabled' : ''}>${text('Add to team', '加入队伍')}</button></div><div class="current-team-members">${team.length ? team.map(id => { const mon = roster.find(entry => String(entry.id) === String(id)); return mon ? `<button type="button" class="battle-member-remove" data-id="${mon.id}">${mon.shiny ? '✨ ' : ''}${monName(mon)} · Lv.${mon.level || 100} ×</button>` : ''; }).join('') : `<span class="muted">${text('No Pokémon selected yet.', '尚未选择宝可梦。')}</span>`}</div>`;
    const search = byId('battle-picker-search');
    if (search) search.oninput = () => { battleQuery = search.value; renderBattlePicker(); };
    const add = byId('battle-picker-add');
    if (add) add.onclick = async () => {
      const selected = byId('battle-picker-select')?.value;
      if (!selected) return;
      await window.tokenCompanion.setTeam([...team, selected]);
      await quickRefresh();
      renderBattlePicker();
    };
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
      const names = empty ? text('No saved lineup', '暂无已保存队伍') : members.map(mon => `${monName(mon)} Lv.${mon.level || 100}`).join(' · ');
      return `<article class="saved-team-card ${empty ? 'empty' : ''}"><strong>${text(`Team ${slot + 1}`, `队伍 ${slot + 1}`)}</strong><div class="saved-team-preview">${names}</div><div class="saved-team-actions"><button type="button" class="save-team-slot" data-slot="${slot}" ${state.team?.length ? '' : 'disabled'}>${empty ? text('Save current', '保存当前队伍') : text('Overwrite', '覆盖保存')}</button><button type="button" class="load-team-slot" data-slot="${slot}" ${empty ? 'disabled' : ''}>${text('Load', '载入')}</button><button type="button" class="clear-team-slot danger" data-slot="${slot}" ${empty ? 'disabled' : ''}>${text('Clear', '清空')}</button></div></article>`;
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
