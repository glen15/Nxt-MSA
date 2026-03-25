const express = require('express');
const db = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 3000;

const FACTORIES = [
  { name: 'engine', port: 3001, displayName: '엔진 공장', emoji: '🔧', color: '#e74c3c' },
  { name: 'tire', port: 3002, displayName: '타이어 공장', emoji: '🛞', color: '#3498db' },
  { name: 'battery', port: 3003, displayName: '배터리 공장', emoji: '🔋', color: '#2ecc71' },
];

// SQLite에서 직접 읽기 (HTTP 불필요)
app.get('/api/factories', (req, res) => {
  res.json(FACTORIES.map(f => ({
    ...f,
    online: true,
    stats: db.getStatsByFactory(f.name),
    jobs: db.getJobsByFactory(f.name),
  })));
});

app.get('/', (req, res) => {
  res.type('html').send(buildHTML());
});

app.listen(PORT, () => {
  console.log('\n🏭 공장 통합 대시보드 (포트: ' + PORT + ')');
  console.log('   엔진 공장:   http://localhost:3001');
  console.log('   타이어 공장: http://localhost:3002');
  console.log('   배터리 공장: http://localhost:3003\n');
});

function buildHTML() {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Factory Hub</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, 'Segoe UI', sans-serif;
  background: #0a0a14;
  color: #d0d0e0;
  min-height: 100vh;
}

header {
  background: #12121f;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #1e1e32;
}

.header-title { font-size: 1.3rem; font-weight: 700; color: #fff; }

.live-badge {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.8rem; color: #666;
}

.live-dot {
  width: 7px; height: 7px; background: #2ecc71; border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

.tab-bar {
  display: flex; background: #0f0f1a;
  border-bottom: 1px solid #1e1e32; padding: 0 1rem;
}

.tab {
  padding: 0.9rem 1.5rem; cursor: pointer; font-size: 0.9rem;
  color: #666; border-bottom: 3px solid transparent;
  transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem;
  user-select: none;
}

.tab:hover { color: #aaa; background: #12121f; }
.tab.active { color: #fff; }

.badge-count {
  font-size: 0.7rem; font-weight: 700;
  padding: 0.1rem 0.45rem; border-radius: 8px;
  min-width: 1.2rem; text-align: center;
}

.overview-cards {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem; padding: 1.5rem 2rem;
}

.factory-card {
  background: #14142a; border: 1px solid #1e1e32;
  border-radius: 8px; padding: 1.2rem 1.5rem;
  cursor: pointer; transition: all 0.2s; border-left: 4px solid;
}

.factory-card:hover { background: #1a1a32; transform: translateY(-1px); }

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 0.8rem;
}

.card-name { font-size: 1.1rem; font-weight: 600; color: #fff; }

.card-stats { display: flex; gap: 1.5rem; font-size: 0.85rem; color: #888; }
.card-stats span { display: flex; align-items: center; gap: 0.3rem; }
.card-stat-num { font-weight: 700; font-size: 1.1rem; }

.stats-bar {
  display: flex; gap: 2rem; padding: 1rem 2rem;
  background: #0e0e1a; border-bottom: 1px solid #1e1e32;
}

.stat-value { font-size: 1.8rem; font-weight: 700; color: #fff; }
.stat-label { font-size: 0.75rem; color: #555; margin-top: 0.1rem; }

main { padding: 0 2rem 2rem; }

table { width: 100%; border-collapse: collapse; margin-top: 1rem; }

thead th {
  text-align: left; padding: 0.7rem 0.8rem;
  font-size: 0.7rem; text-transform: uppercase;
  letter-spacing: 0.06em; color: #444;
  border-bottom: 1px solid #1e1e32;
}

tbody tr { border-bottom: 1px solid #111122; transition: background 0.15s; }
tbody tr:hover { background: #14142a; }
td { padding: 0.7rem 0.8rem; font-size: 0.85rem; }

.factory-tag {
  font-size: 0.7rem; font-weight: 600;
  padding: 0.15rem 0.5rem; border-radius: 3px; white-space: nowrap;
}

.job-id {
  font-family: 'SF Mono','Fira Code','Consolas',monospace; font-size: 0.78rem;
}

.badge {
  display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px;
  font-size: 0.72rem; font-weight: 600; white-space: nowrap;
}

.badge.progress { background: #3498db20; color: #3498db; border: 1px solid #3498db33; }
.badge.done { background: #2ecc7120; color: #2ecc71; border: 1px solid #2ecc7133; }
.badge.waiting { background: #f39c1220; color: #f39c12; border: 1px solid #f39c1233; }

.progress-wrap { display: flex; align-items: center; gap: 0.4rem; }

.progress-bar {
  width: 80px; height: 5px; background: #1e1e32;
  border-radius: 3px; overflow: hidden;
}

.progress-fill {
  height: 100%; border-radius: 3px; transition: width 0.4s ease;
}

.progress-fill.indeterminate {
  width: 30% !important;
  animation: slide 1.2s ease-in-out infinite;
}

@keyframes slide { 0%{margin-left:0} 50%{margin-left:70%} 100%{margin-left:0} }

.progress-pct { font-size: 0.7rem; color: #555; min-width: 2rem; }

.elapsed {
  font-family: 'SF Mono','Fira Code','Consolas',monospace; font-size: 0.8rem;
}

.elapsed.active { color: #3498db; }
.elapsed.done { color: #2ecc71; }

.detail { font-size: 0.78rem; color: #555; }
.qty { font-weight: 600; text-align: center; }

.empty-state { text-align: center; padding: 4rem 2rem; color: #333; }
.empty-state .icon { font-size: 3rem; margin-bottom: 0.8rem; opacity: 0.4; }
.empty-state .text { font-size: 1rem; }

@media (max-width: 768px) {
  .tab { padding: 0.7rem 1rem; font-size: 0.8rem; }
  .overview-cards { padding: 1rem; }
  main { padding: 0 1rem 1rem; }
  td, th { padding: 0.5rem 0.4rem; font-size: 0.78rem; }
  .progress-bar { width: 50px; }
}
</style>
</head>
<body>

<header>
  <div class="header-title">🏭 공장 통합 대시보드</div>
  <div class="live-badge"><span class="live-dot"></span>2초 간격 갱신</div>
</header>

<div class="tab-bar" id="tab-bar"></div>
<div id="content"></div>

<script>
var FACTORY_META = {
  engine: { displayName: '엔진 공장', emoji: '🔧', color: '#e74c3c' },
  tire:   { displayName: '타이어 공장', emoji: '🛞', color: '#3498db' },
  battery:{ displayName: '배터리 공장', emoji: '🔋', color: '#2ecc71' }
};

var factories = [];
var activeTab = 'all';

// 이벤트 위임 — 따옴표 이스케이프 문제 회피
document.getElementById('tab-bar').addEventListener('click', function(e) {
  var tab = e.target.closest('[data-tab]');
  if (tab) {
    activeTab = tab.dataset.tab;
    renderTabs();
    renderContent();
  }
});

function fetchData() {
  fetch('/api/factories')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      factories = data;
      renderTabs();
      renderContent();
    })
    .catch(function(e) { console.error(e); });
}

function renderTabs() {
  var bar = document.getElementById('tab-bar');
  var totalIP = 0;
  factories.forEach(function(f) { totalIP += (f.stats ? f.stats.inProgress : 0); });

  var html = '<div class="tab' + (activeTab === 'all' ? ' active' : '') +
    '" data-tab="all" style="border-bottom-color:' +
    (activeTab === 'all' ? '#fff' : 'transparent') + '">📊 전체';
  if (totalIP > 0) html += ' <span class="badge-count" style="background:#3498db30;color:#3498db">' + totalIP + '</span>';
  html += '</div>';

  factories.forEach(function(f) {
    var a = activeTab === f.name;
    var ip = f.stats ? f.stats.inProgress : 0;
    html += '<div class="tab' + (a ? ' active' : '') +
      '" data-tab="' + f.name +
      '" style="border-bottom-color:' + (a ? f.color : 'transparent') + '">' +
      f.emoji + ' ' + f.displayName;
    if (ip > 0) html += ' <span class="badge-count" style="background:' + f.color + '30;color:' + f.color + '">' + ip + '</span>';
    html += '</div>';
  });

  bar.innerHTML = html;
}

function renderContent() {
  var el = document.getElementById('content');
  if (activeTab === 'all') {
    el.innerHTML = renderOverview();
  } else {
    var f = factories.find(function(x) { return x.name === activeTab; });
    if (!f) { el.innerHTML = ''; return; }
    el.innerHTML = renderFactory(f);
  }
}

function renderOverview() {
  var cards = '<div class="overview-cards">';
  factories.forEach(function(f) {
    var s = f.stats || { total:0, inProgress:0, completed:0 };
    cards += '<div class="factory-card" data-tab="' + f.name + '" style="border-left-color:' + f.color + '">' +
      '<div class="card-header"><div class="card-name">' + f.emoji + ' ' + f.displayName + '</div></div>' +
      '<div class="card-stats">' +
        '<span>전체 <span class="card-stat-num" style="color:#fff">' + s.total + '</span></span>' +
        '<span>진행 <span class="card-stat-num" style="color:' + f.color + '">' + s.inProgress + '</span></span>' +
        '<span>완료 <span class="card-stat-num" style="color:#2ecc71">' + s.completed + '</span></span>' +
      '</div></div>';
  });
  cards += '</div>';

  var allJobs = [];
  factories.forEach(function(f) {
    if (!f.jobs) return;
    var m = FACTORY_META[f.name] || {};
    f.jobs.forEach(function(j) {
      var copy = {};
      for (var k in j) copy[k] = j[k];
      copy.factoryName = m.displayName || f.name;
      copy.factoryEmoji = m.emoji || '';
      copy.factoryColor = m.color || f.color;
      allJobs.push(copy);
    });
  });

  return cards + renderJobTable(allJobs, true);
}

function renderFactory(f) {
  var s = f.stats || { total:0, inProgress:0, completed:0 };
  var stats = '<div class="stats-bar">' +
    '<div><div class="stat-value">' + s.total + '</div><div class="stat-label">전체 요청</div></div>' +
    '<div><div class="stat-value" style="color:' + f.color + '">' + s.inProgress + '</div><div class="stat-label">진행 중</div></div>' +
    '<div><div class="stat-value" style="color:#2ecc71">' + s.completed + '</div><div class="stat-label">완료</div></div>' +
  '</div>';

  var jobs = (f.jobs || []).map(function(j) {
    var copy = {};
    for (var k in j) copy[k] = j[k];
    copy.factoryColor = f.color;
    return copy;
  });

  return stats + '<main>' + renderJobTable(jobs, false) + '</main>';
}

function renderJobTable(jobs, showFactory) {
  if (jobs.length === 0) {
    return '<div class="empty-state"><div class="icon">📦</div><div class="text">생산 요청이 없습니다</div></div>';
  }

  var sorted = jobs.slice().sort(function(a, b) {
    if (a.statusType === 'done' && b.statusType !== 'done') return 1;
    if (a.statusType !== 'done' && b.statusType === 'done') return -1;
    return new Date(b.startedAt) - new Date(a.startedAt);
  });

  var fth = showFactory ? '<th>공장</th>' : '';
  var html = '<table><thead><tr>' + fth +
    '<th>작업 ID</th><th>발주 번호</th><th>부품</th>' +
    '<th style="text-align:center">수량</th><th>상태</th>' +
    '<th>진행률</th><th>경과 시간</th><th>상세</th></tr></thead><tbody>';

  sorted.forEach(function(job) {
    var elapsed = formatElapsed(job.startedAt, job.completedAt);
    var isDone = job.statusType === 'done';
    var isWait = job.statusType === 'waiting';
    var bc = isDone ? 'done' : (isWait ? 'waiting' : 'progress');
    var c = job.factoryColor || '#3498db';

    var ph;
    if (job.progress < 0) {
      ph = '<div class="progress-wrap"><div class="progress-bar">' +
        '<div class="progress-fill indeterminate" style="background:' + c + '"></div>' +
        '</div><span class="progress-pct">...</span></div>';
    } else {
      var fs = isDone ? 'background:linear-gradient(90deg,#2ecc71,#27ae60)' : 'background:' + c;
      ph = '<div class="progress-wrap"><div class="progress-bar">' +
        '<div class="progress-fill" style="width:' + job.progress + '%;' + fs + '"></div>' +
        '</div><span class="progress-pct">' + job.progress + '%</span></div>';
    }

    var ftd = '';
    if (showFactory) {
      ftd = '<td><span class="factory-tag" style="background:' + c + '18;color:' + c + '">' +
        (job.factoryEmoji||'') + ' ' + (job.factoryName||'') + '</span></td>';
    }

    html += '<tr>' + ftd +
      '<td class="job-id" style="color:' + c + '">' + truncate(job.id, 16) + '</td>' +
      '<td class="job-id" style="color:#888">' + truncate(job.purchaseOrderId, 14) + '</td>' +
      '<td>' + (job.partId||'') + '</td>' +
      '<td class="qty">' + (job.quantity||0) + '</td>' +
      '<td><span class="badge ' + bc + '">' + (job.status||'') + '</span></td>' +
      '<td>' + ph + '</td>' +
      '<td class="elapsed ' + (isDone ? 'done' : 'active') + '">' + elapsed + '</td>' +
      '<td class="detail">' + (job.detail||'') + '</td></tr>';
  });

  return html + '</tbody></table>';
}

function truncate(s, max) {
  if (!s) return '-';
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function formatElapsed(startISO, endISO) {
  if (!startISO) return '-';
  var start = new Date(startISO);
  var end = endISO ? new Date(endISO) : new Date();
  var diff = Math.max(0, Math.floor((end - start) / 1000));
  var min = Math.floor(diff / 60);
  var sec = diff % 60;
  if (min > 0) return min + '분 ' + sec + '초';
  return sec + '초';
}

fetchData();
setInterval(fetchData, 2000);
setInterval(function() {
  if (factories.some(function(f) { return f.stats && f.stats.inProgress > 0; })) renderContent();
}, 1000);
</script>
</body>
</html>`;
}

module.exports = app;
