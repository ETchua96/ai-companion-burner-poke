(() => {
  const byId = id => document.getElementById(id);
  const text = (en, zh) => (typeof language !== 'undefined' && language === 'zh-CN' ? zh : en);

  function moveControlsIntoBattle() {
    const controls = byId('saved-team-controls');
    const slots = byId('team-slots');
    if (controls && slots && controls.parentElement?.id !== 'battle') slots.after(controls);
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
  moveControlsIntoBattle();
  const slots = byId('team-slots');
  if (slots) new MutationObserver(renderSavedTeams).observe(slots, { childList: true });
})();
