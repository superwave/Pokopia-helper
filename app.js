'use strict';

// ── 狀態 ────────────────────────────────────────────────
let allHabitats = [];
let filteredIds = [];     // 目前顯示的 id 清單

// 反向索引（載入後建立）
const pokemonIndex  = {};  // pokemonName  → [id, ...]
const materialIndex = {};  // materialName → [id, ...]
const habitatMap    = {};  // id           → habitat

// localStorage key
const LS_KEY = 'pokopia_done';

function loadDone() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]')); }
  catch { return new Set(); }
}
function saveDone(set) {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
}

let doneSet = loadDone();

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

  // 1. 棲息地名稱（模糊）
  allHabitats.forEach(h => {
    if (h.name.toLowerCase().includes(q)) matchSet.add(h.id);
  });

  // 2. 寶可夢名稱（精確詞頭 + 模糊）
  Object.keys(pokemonIndex).forEach(name => {
    if (name.toLowerCase().includes(q)) {
      pokemonIndex[name].forEach(id => matchSet.add(id));
    }
  });

  // 3. 材料名稱（精確詞頭 + 模糊）
  Object.keys(materialIndex).forEach(name => {
    if (name.toLowerCase().includes(q)) {
      materialIndex[name].forEach(id => matchSet.add(id));
    }
  });

  // 按原始順序排列
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
  const done = doneSet.has(h.id);

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
    <div class="card${done ? ' done' : ''}" data-id="${h.id}">
      <input class="card-check" type="checkbox" ${done ? 'checked' : ''}
             title="標記完成" aria-label="標記完成">
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

// ── 渲染格子 ─────────────────────────────────────────────
function renderGrid() {
  const query      = document.getElementById('search-input').value.trim();
  const hideDone   = document.getElementById('hide-done').checked;

  let ids = search(query);
  if (hideDone) ids = ids.filter(id => !doneSet.has(id));

  filteredIds = ids;

  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty-msg');
  const count = document.getElementById('result-count');

  if (ids.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    count.textContent = '0 筆';
  } else {
    empty.hidden = true;
    grid.innerHTML = ids.map(id => renderCard(habitatMap[id], query)).join('');
    count.textContent = `${ids.length} 筆`;
  }
}

// ── 事件委派（checkbox） ──────────────────────────────────
document.getElementById('grid').addEventListener('change', e => {
  const cb = e.target;
  if (!cb.classList.contains('card-check')) return;
  const card = cb.closest('.card');
  const id = card.dataset.id;

  if (cb.checked) { doneSet.add(id); card.classList.add('done'); }
  else            { doneSet.delete(id); card.classList.remove('done'); }
  saveDone(doneSet);

  // 如果「隱藏已完成」開啟，立即重新渲染
  if (document.getElementById('hide-done').checked) renderGrid();
});

// ── 工具列事件 ───────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', renderGrid);
document.getElementById('hide-done').addEventListener('change', renderGrid);
document.getElementById('clear-all').addEventListener('click', () => {
  if (!confirm('確定要清除所有已完成的勾選嗎？')) return;
  doneSet.clear();
  saveDone(doneSet);
  renderGrid();
});

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
