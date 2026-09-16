(() => {
  const byId = id => document.getElementById(id);
  const text = (en, zh) => (typeof language !== 'undefined' && language === 'zh-CN' ? zh : en);
  let query = '', filter = 'all', type = 'all', level = 'all';
  const typeOptions = ['bug','dark','dragon','electric','fairy','fighting','fire','flying','ghost','grass','ground','ice','normal','poison','psychic','rock','steel','water'];
  const levelMatches = value => level === 'all' || (level === '1-20' && value <= 20) || (level === '21-50' && value >= 21 && value <= 50) || (level === '51-99' && value >= 51 && value <= 99) || (level === '100' && value >= 100);

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
    controls.innerHTML = `<div class="filter-deck"><label>${text('Name or number', '名称或编号')}<input id="inventory-search" type="search" value="${query.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}" placeholder="${text('Type to filter…', '输入筛选…')}"></label><label>${text('Type', '属性')}<select id="inventory-type"><option value="all">${text('All types', '全部属性')}</option>${typeOptions.map(item => `<option value="${item}">${item[0].toUpperCase() + item.slice(1)}</option>`).join('')}</select></label><label>${text('Shiny', '闪光')}<select id="inventory-filter"><option value="all">${text('All', '全部')}</option><option value="shiny">${text('Shiny only', '仅闪光')}</option><option value="normal">${text('Non-shiny', '非闪光')}</option></select></label><label>${text('Level', '等级')}<select id="inventory-level"><option value="all">${text('All levels', '全部等级')}</option><option value="1-20">Lv. 1–20</option><option value="21-50">Lv. 21–50</option><option value="51-99">Lv. 51–99</option><option value="100">Lv. 100</option></select></label><span id="inventory-filter-count" class="filter-count"></span></div>`;
    const filterSelect = byId('inventory-filter');
    filterSelect.value = filter;
    const typeSelect = byId('inventory-type'), levelSelect = byId('inventory-level');
    typeSelect.value = type; levelSelect.value = level;
    byId('inventory-search').oninput = event => { query = event.target.value; apply(); };
    filterSelect.onchange = event => { filter = event.target.value; apply(); };
    typeSelect.onchange = event => { type = event.target.value; apply(); };
    levelSelect.onchange = event => { level = event.target.value; apply(); };
    return grid;
  }

  function apply() {
    const grid = install();
    if (!grid || typeof owned !== 'function') return;
    const terms = query.trim().toLowerCase();
    let shown = 0;
    grid.querySelectorAll('.monster-card').forEach(card => {
      const mon = owned().find(entry => String(entry.id) === String(card.dataset.id));
      const types = (lineFor(mon.line).types?.[monStage(mon)] || []).join(' ').toLowerCase();
      const matchesQuery = !terms || monName(mon).toLowerCase().includes(terms) || String(monSpriteId(mon)) === terms || types.includes(terms);
      const matchesFilter = filter === 'all' || (filter === 'shiny' && mon.shiny) || (filter === 'normal' && !mon.shiny);
      const matchesType = type === 'all' || types.split(' ').includes(type);
      const visible = Boolean(mon && matchesQuery && matchesFilter && matchesType && levelMatches(mon.level || 100));
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
