const express = require('express');
const path = require('path');
const db = require('../shared/db');

const app = express();
const PORT = process.env.PORT || 3000;

const FACTORIES = [
  { name: 'engine', port: 3001, displayName: '엔진 공장', emoji: '🔧', color: '#e74c3c' },
  { name: 'tire', port: 3002, displayName: '타이어 공장', emoji: '🛞', color: '#3498db' },
  { name: 'battery', port: 3003, displayName: '배터리 공장', emoji: '🔋', color: '#2ecc71' },
];

// 정적 파일 서빙 (app.js)
app.use(express.static(path.join(__dirname, 'public')));

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

/* API 문서 */
.api-docs { padding: 1.5rem 2rem; max-width: 960px; }

.api-factory {
  margin-bottom: 2rem; border: 1px solid #1e1e32;
  border-radius: 8px; overflow: hidden;
}

.api-factory-header {
  padding: 0.8rem 1.2rem; font-size: 1rem; font-weight: 700;
  color: #fff; display: flex; align-items: center; gap: 0.5rem;
}

.api-endpoint { padding: 1rem 1.2rem; border-top: 1px solid #1e1e32; }

.api-endpoint-title {
  display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.5rem;
}

.method {
  font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.5rem;
  border-radius: 3px; font-family: 'SF Mono','Fira Code','Consolas',monospace;
}

.method.get { background: #2ecc7125; color: #2ecc71; }
.method.post { background: #f39c1225; color: #f39c12; }
.method.delete { background: #e74c3c25; color: #e74c3c; }

.api-path {
  font-family: 'SF Mono','Fira Code','Consolas',monospace;
  font-size: 0.85rem; color: #ddd;
}

.api-desc { font-size: 0.8rem; color: #888; margin-bottom: 0.5rem; }

.api-code {
  background: #0a0a18; border: 1px solid #1a1a2e; border-radius: 4px;
  padding: 0.7rem 1rem; overflow-x: auto; position: relative;
}

.api-code pre {
  font-family: 'SF Mono','Fira Code','Consolas',monospace;
  font-size: 0.78rem; color: #aaa; margin: 0;
  white-space: pre; line-height: 1.5;
}

.copy-btn {
  position: absolute; top: 0.4rem; right: 0.4rem;
  background: #1e1e32; border: 1px solid #2a2a3e; color: #888;
  padding: 0.2rem 0.5rem; border-radius: 3px; cursor: pointer;
  font-size: 0.7rem;
}

.copy-btn:hover { color: #fff; background: #2a2a3e; }

.api-label {
  font-size: 0.7rem; color: #555; text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 0.3rem; margin-top: 0.5rem;
}

.api-note {
  background: #14142a; border-left: 3px solid #f39c12;
  padding: 0.6rem 1rem; margin: 0 0 2rem 0; border-radius: 0 4px 4px 0;
  font-size: 0.8rem; color: #ccc;
}

.api-note strong { color: #f39c12; }

/* 아키텍처 설명 */
.arch-section { padding: 0 2rem 2rem; max-width: 960px; }

.arch-title {
  font-size: 1.2rem; color: #fff; margin-bottom: 1.5rem;
  padding-bottom: 0.5rem; border-bottom: 1px solid #1e1e32;
}

.arch-subtitle {
  font-size: 0.95rem; color: #ddd; margin: 1.5rem 0 0.8rem;
}

.arch-table {
  width: 100%; border-collapse: collapse; margin-bottom: 1rem;
  font-size: 0.85rem;
}

.arch-table th, .arch-table td {
  padding: 0.6rem 0.8rem; border: 1px solid #1e1e32;
  text-align: left;
}

.arch-table th { background: #12121f; color: #aaa; font-size: 0.8rem; }
.arch-table td { background: #0e0e1a; }
.arch-table code { color: #3498db; font-size: 0.8rem; }
.arch-label { color: #888; font-weight: 600; font-size: 0.8rem; }
.arch-diff { color: #f39c12 !important; font-weight: 600; }

.arch-contract {
  background: #0a0a18; border: 1px solid #1e1e32; border-radius: 6px;
  padding: 1rem; margin-bottom: 0.8rem;
}

.arch-contract-label {
  font-size: 0.75rem; color: #f39c12; text-transform: uppercase;
  letter-spacing: 0.05em; margin-bottom: 0.5rem; font-weight: 600;
}

.arch-contract pre {
  font-family: 'SF Mono','Fira Code','Consolas',monospace;
  font-size: 0.8rem; color: #2ecc71; margin: 0; line-height: 1.5;
}

.arch-text { font-size: 0.85rem; color: #999; line-height: 1.6; margin-bottom: 0.5rem; }
.arch-text strong { color: #fff; }

.arch-flow { margin: 1rem 0; overflow-x: auto; }

.arch-flow-row {
  display: flex; align-items: center; gap: 0.3rem;
  padding: 1rem; min-width: 700px;
}

.arch-flow-box {
  background: #14142a; border: 2px solid; border-radius: 8px;
  padding: 0.8rem 1rem; text-align: center;
  font-size: 0.85rem; color: #fff; font-weight: 600;
  min-width: 100px;
}

.arch-flow-box small { display: block; font-size: 0.7rem; color: #888; font-weight: 400; margin-top: 0.2rem; }
.arch-flow-arrow { color: #555; font-size: 1.2rem; flex-shrink: 0; }

.arch-adapters { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; }

.arch-adapter {
  background: #14142a; border-left: 3px solid;
  padding: 0.6rem 1rem; border-radius: 0 6px 6px 0;
  display: flex; align-items: center; gap: 1rem;
  font-size: 0.85rem;
}

.arch-adapter strong { color: #fff; min-width: 160px; }
.arch-adapter-flow { color: #aaa; }
.arch-adapter-flow code { color: #3498db; font-size: 0.8rem; }

.arch-benefits {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.8rem; margin: 1rem 0;
}

.arch-benefit {
  background: #14142a; border: 1px solid #1e1e32;
  border-radius: 8px; padding: 1rem;
  display: flex; gap: 0.8rem; align-items: flex-start;
  font-size: 0.83rem; color: #aaa; line-height: 1.5;
}

.arch-benefit strong { color: #fff; display: block; margin-bottom: 0.2rem; }
.arch-benefit-icon { font-size: 1.5rem; flex-shrink: 0; }

.arch-without {
  background: #1a0a0a; border: 1px solid #2a1a1a;
  border-radius: 8px; padding: 1rem; margin: 1rem 0;
}

.arch-without-item {
  padding: 0.4rem 0; font-size: 0.83rem; color: #bbb;
  display: flex; align-items: flex-start; gap: 0.5rem;
}

.arch-without-item b { color: #e74c3c; }
.arch-x { color: #e74c3c; font-weight: 700; font-size: 1rem; flex-shrink: 0; }

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

<script src="/app.js"></script>
</body>
</html>`;
}

module.exports = app;
