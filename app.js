'use strict';

// ── 狀態 ────────────────────────────────────────────────
let allHabitats = [];
let filteredIds = [];
let currentView = 'card'; // 'card' | 'list'

// 反向索引
const pokemonIndex  = {};
const materialIndex = {};
const habitatMap    = {};

// ── 索引建立 ─────────────────────────────────────────────
function buildIndexes(habitats) {
  habitats.forEach(h => {
    habitatMap[h.id] = h;
    h.pokemon.forEach(p => {
      (pokemonIndex[p.name] ??= []).push(h.id);
    });
    h.materials.forEach(m => {
      (materialIndex[m.name] ??= []).push(h.id);
    });
  });
}

// ── 搜尋 ─────────────────────────────────────────────────
function search(query) {
  query = query.trim();
  if (!query) return allHabitats.map(h => h.id);

  const q = query.toLowerCase();
  const matchSet = new Set();

  allHabitats.forEach(h => {
    if (h.name.toLowerCase().includes(q)) matchSet.add(h.id);
  });
  Object.keys(pokemonIndex).forEach(name => {
    if (name.toLowerCase().includes(q)) {
      pokemonIndex[name].forEach(id => matchSet.add(id));
    }
  });
  Object.keys(materialIndex).forEach(name => {
    if (name.toLowerCase().includes(q)) {
      materialIndex[name].forEach(id => matchSet.add(id));
    }
  });

  return allHabitats.filter(h => matchSet.has(h.id)).map(h => h.id);
}

// ── 星星 ─────────────────────────────────────────────────
function stars(n) {
  return '<span class="stars" title="稀有度 ' + n + '">' + '★'.repeat(n) + '</span>';
}

// ── 高亮 ─────────────────────────────────────────────────
function highlight(text, query) {
  if (!query) return escHtml(text);
  const re = new RegExp('(' + escRe(query) + ')', 'gi');
  return escHtml(text).replace(re, '<mark>$1</mark>');
}

function escHtml(s) {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ── 卡片渲染 ─────────────────────────────────────────────
function renderCard(h, query) {
  const matHtml = h.materials.length
    ? h.materials.map(m =>
        `<span class="material-tag">${highlight(m.name, query)} ×${m.count}</span>`
      ).join('')
    : '<span style="color:#aaa;font-size:.8rem">—</span>';

  const pokeHtml = h.pokemon.length
    ? h.pokemon.map(p =>
        `<div class="pokemon-row">
           <span class="pokemon-name">${highlight(p.name, query)}</span>
           ${stars(p.rarity)}
         </div>`
      ).join('')
    : '<span style="color:#aaa;font-size:.8rem">—</span>';

  return `
    <div class="card" data-id="${h.id}">
      <div class="card-img-wrap">
        <img src="${h.image}" alt="${escHtml(h.name)}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.hidden=false">
        <span class="no-img" hidden>無圖片</span>
      </div>
      <div class="card-body">
        <div class="card-id">No.${h.id}</div>
        <div class="card-name">${highlight(h.name, query)}</div>
        <div class="card-section-title">材料</div>
        <div class="material-list">${matHtml}</div>
        <div class="card-section-title">寶可夢</div>
        <div class="pokemon-list">${pokeHtml}</div>
      </div>
    </div>`;
}

// ── 列表渲染 ─────────────────────────────────────────────
function renderListItem(h, query) {
  const matHtml = h.materials.length
    ? h.materials.map(m =>
        `<span class="material-tag">${highlight(m.name, query)} ×${m.count}</span>`
      ).join('')
    : '<span style="color:#aaa;font-size:.8rem">—</span>';

  const pokeHtml = h.pokemon.length
    ? h.pokemon.map(p =>
        `<span class="pokemon-inline">${highlight(p.name, query)} ${stars(p.rarity)}</span>`
      ).join('')
    : '<span style="color:#aaa;font-size:.8rem">—</span>';

  return `
    <div class="list-item" data-id="${h.id}">
      <div class="list-img-wrap">
        <img src="${h.image}" alt="${escHtml(h.name)}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.hidden=false">
        <span class="no-img" hidden>無圖片</span>
      </div>
      <div class="list-body">
        <div class="list-header">
          <span class="card-id">No.${h.id}</span>
          <span class="card-name">${highlight(h.name, query)}</span>
        </div>
        <div class="list-details">
          <div class="list-section">
            <span class="card-section-title">材料</span>
            <div class="material-list">${matHtml}</div>
          </div>
          <div class="list-section">
            <span class="card-section-title">寶可夢</span>
            <div class="pokemon-inline-list">${pokeHtml}</div>
          </div>
        </div>
      </div>
    </div>`;
}

// ── 渲染格子 ─────────────────────────────────────────────
function renderGrid() {
  const query = document.getElementById('search-input').value.trim();
  let ids = search(query);
  filteredIds = ids;

  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty-msg');
  const count = document.getElementById('result-count');

  if (currentView === 'card') {
    grid.className = 'grid';
  } else {
    grid.className = 'grid list-view';
  }

  if (ids.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    count.textContent = '0 筆';
  } else {
    empty.hidden = true;
    const renderer = currentView === 'card' ? renderCard : renderListItem;
    grid.innerHTML = ids.map(id => renderer(habitatMap[id], query)).join('');
    count.textContent = `${ids.length} 筆`;
  }
}

// ── 切換檢視模式 ─────────────────────────────────────────
function setView(view) {
  currentView = view;
  document.getElementById('view-card').classList.toggle('active', view === 'card');
  document.getElementById('view-list').classList.toggle('active', view === 'list');
  renderGrid();
}

// ── 事件 ─────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', renderGrid);
document.getElementById('view-card').addEventListener('click', () => setView('card'));
document.getElementById('view-list').addEventListener('click', () => setView('list'));

// ── 載入資料 ─────────────────────────────────────────────
fetch('data/habitats.json')
  .then(r => r.json())
  .then(data => {
    allHabitats = data;
    buildIndexes(data);
    renderGrid();
  })
  .catch(err => {
    document.getElementById('grid').innerHTML =
      `<p style="color:red;padding:2rem">載入資料失敗：${err.message}</p>`;
  });
