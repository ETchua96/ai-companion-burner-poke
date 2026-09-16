(() => {
  const byId = id => document.getElementById(id);
  const text = (en, zh) => (typeof language !== 'undefined' && language === 'zh-CN' ? zh : en);
  let query = '', filter = 'all';

  function install() {
    const grid = byId('inventory-grid');
    if (!grid) return null;
    let controls = byId('inventory-filter-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'inventory-filter-controls';
      controls.className = 'inventory-filter-controls toolbar';
      grid.before(controls);
    }
    controls.innerHTML = `<label>${text('Search', '搜索')}<input id="inventory-search" type="search" value="${query.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" placeholder="${text('Pokémon name or number', '宝可梦名称或编号')}"></label><label>${text('Filter', '筛选')}<select id="inventory-filter"><option value="all">${text('All Pokémon', '全部宝可梦')}</option><option value="shiny">${text('Shiny only', '仅闪光')}</option><option value="normal">${text('Non-shiny only', '仅普通')}</option></select></label><span id="inventory-filter-count" class="muted"></span>`;
    const filterSelect = byId('inventory-filter');
    filterSelect.value = filter;
    byId('inventory-search').oninput = event => { query = event.target.value; apply(); };
    filterSelect.onchange = event => { filter = event.target.value; apply(); };
    return grid;
  }

  function apply() {
    const grid = install();
    if (!grid || typeof owned !== 'function') return;
    const terms = query.trim().toLowerCase();
    let shown = 0;
    grid.querySelectorAll('.monster-card').forEach(card => {
      const mon = owned().find(entry => String(entry.id) === String(card.dataset.id));
      const matchesQuery = !terms || (monName(mon).toLowerCase().includes(terms)) || String(monSpriteId(mon)) === terms;
      const matchesFilter = filter === 'all' || (filter === 'shiny' && mon.shiny) || (filter === 'normal' && !mon.shiny);
      const visible = Boolean(mon && matchesQuery && matchesFilter);
      card.style.display = visible ? '' : 'none';
      if (visible) shown++;
    });
    const count = byId('inventory-filter-count');
    if (count) count.textContent = text(`${shown} shown`, `显示 ${shown} 只`);
  }

  window.renderInventoryFilters = apply;
  const grid = byId('inventory-grid');
  if (grid) new MutationObserver(apply).observe(grid, { childList: true });
})();
