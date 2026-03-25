// 공장 대시보드 — 생산 현황 실시간 웹 페이지 (3개 공장 공통)
const db = require('./db');

function createDashboard(express, { name, displayName, emoji, color }) {
  const router = express.Router();

  router.get('/dashboard/jobs', (req, res) => {
    const jobs = db.getJobsByFactory(name);
    const stats = db.getStatsByFactory(name);
    res.json({ factory: name, displayName, stats, jobs });
  });

  router.get('/', (req, res) => {
    res.type('html').send(buildHTML(displayName, emoji, color));
  });

  return router;
}

function buildHTML(displayName, emoji, color) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emoji} ${displayName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: -apple-system, 'Segoe UI', sans-serif;
      background: #0f0f1a;
      color: #d0d0e0;
      min-height: 100vh;
    }

    header {
      background: #1a1a2e;
      border-bottom: 3px solid ${color};
      padding: 1.2rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .factory-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
    }

    .factory-title .emoji { font-size: 1.8rem; margin-right: 0.5rem; }

    .live-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: #888;
    }

    .live-dot {
      width: 8px; height: 8px;
      background: #2ecc71;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .stats-bar {
      display: flex;
      gap: 2rem;
      padding: 1.2rem 2rem;
      background: #12121f;
      border-bottom: 1px solid #1a1a2e;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
    }

    .stat-label { font-size: 0.8rem; color: #666; margin-top: 0.1rem; }
    .stat.in-progress .stat-value { color: ${color}; }
    .stat.completed .stat-value { color: #2ecc71; }

    main { padding: 1.5rem 2rem; }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead th {
      text-align: left;
      padding: 0.7rem 1rem;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #555;
      border-bottom: 1px solid #2a2a3e;
    }

    tbody tr {
      border-bottom: 1px solid #1a1a2e;
      transition: background 0.2s;
    }

    tbody tr:hover { background: #161628; }

    td { padding: 0.75rem 1rem; font-size: 0.9rem; }

    .job-id {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.8rem;
      color: ${color};
    }

    .po-id {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.8rem;
      color: #999;
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.7rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }

    .badge.progress {
      background: ${color}20;
      color: ${color};
      border: 1px solid ${color}44;
    }

    .badge.done {
      background: #2ecc7120;
      color: #2ecc71;
      border: 1px solid #2ecc7144;
    }

    .badge.waiting {
      background: #f39c1220;
      color: #f39c12;
      border: 1px solid #f39c1244;
    }

    .progress-wrap {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress-bar {
      width: 100px;
      height: 6px;
      background: #2a2a3e;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, ${color}, ${color}cc);
      border-radius: 3px;
      transition: width 0.5s ease;
    }

    .progress-fill.done {
      background: linear-gradient(90deg, #2ecc71, #27ae60);
    }

    .progress-fill.indeterminate {
      width: 30% !important;
      animation: slide 1.2s ease-in-out infinite;
    }

    @keyframes slide {
      0% { margin-left: 0; }
      50% { margin-left: 70%; }
      100% { margin-left: 0; }
    }

    .progress-pct {
      font-size: 0.75rem;
      color: #888;
      min-width: 2.5rem;
    }

    .elapsed {
      font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
      font-size: 0.85rem;
    }

    .elapsed.active { color: ${color}; }
    .elapsed.done { color: #2ecc71; }

    .detail { font-size: 0.8rem; color: #666; }

    .empty-state {
      text-align: center;
      padding: 5rem 2rem;
      color: #444;
    }

    .empty-state .icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
    .empty-state .text { font-size: 1.1rem; }
    .empty-state .sub { font-size: 0.85rem; margin-top: 0.5rem; color: #333; }

    .qty { font-weight: 600; text-align: center; }

    @media (max-width: 768px) {
      header { padding: 1rem; }
      .stats-bar { padding: 1rem; gap: 1.5rem; }
      main { padding: 1rem; }
      td, th { padding: 0.5rem; font-size: 0.8rem; }
      .progress-bar { width: 60px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="factory-title">
      <span class="emoji">${emoji}</span>${displayName}
    </div>
    <div class="live-badge">
      <span class="live-dot"></span>
      <span>2초 간격 갱신</span>
    </div>
  </header>

  <div class="stats-bar">
    <div class="stat total">
      <div class="stat-value" id="stat-total">0</div>
      <div class="stat-label">전체 요청</div>
    </div>
    <div class="stat in-progress">
      <div class="stat-value" id="stat-progress">0</div>
      <div class="stat-label">진행 중</div>
    </div>
    <div class="stat completed">
      <div class="stat-value" id="stat-completed">0</div>
      <div class="stat-label">완료</div>
    </div>
  </div>

  <main>
    <table id="jobs-table" style="display:none">
      <thead>
        <tr>
          <th>작업 ID</th>
          <th>발주 번호</th>
          <th>부품</th>
          <th style="text-align:center">수량</th>
          <th>상태</th>
          <th>진행률</th>
          <th>경과 시간</th>
          <th>상세</th>
        </tr>
      </thead>
      <tbody id="jobs-body"></tbody>
    </table>
    <div id="empty-state" class="empty-state">
      <div class="icon">${emoji}</div>
      <div class="text">생산 요청 대기 중...</div>
      <div class="sub">API로 생산 요청이 들어오면 여기에 표시됩니다</div>
    </div>
  </main>

  <script>
    var jobs = [];

    function fetchJobs() {
      fetch('/dashboard/jobs')
        .then(function(res) { return res.json(); })
        .then(function(data) {
          jobs = data.jobs || [];
          document.getElementById('stat-total').textContent = data.stats.total;
          document.getElementById('stat-progress').textContent = data.stats.inProgress;
          document.getElementById('stat-completed').textContent = data.stats.completed;
          renderJobs();
        })
        .catch(function(e) { console.error('fetch error:', e); });
    }

    function renderJobs() {
      var table = document.getElementById('jobs-table');
      var empty = document.getElementById('empty-state');
      var tbody = document.getElementById('jobs-body');

      if (jobs.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'block';
        return;
      }

      table.style.display = 'table';
      empty.style.display = 'none';

      var sorted = jobs.slice().sort(function(a, b) {
        if (a.statusType === 'done' && b.statusType !== 'done') return 1;
        if (a.statusType !== 'done' && b.statusType === 'done') return -1;
        return new Date(b.startedAt) - new Date(a.startedAt);
      });

      tbody.innerHTML = sorted.map(function(job) {
        var elapsed = formatElapsed(job.startedAt, job.completedAt);
        var isDone = job.statusType === 'done';
        var isWaiting = job.statusType === 'waiting';
        var badgeClass = isDone ? 'done' : (isWaiting ? 'waiting' : 'progress');

        var progressHTML;
        if (job.progress < 0) {
          progressHTML = '<div class="progress-wrap">' +
            '<div class="progress-bar"><div class="progress-fill indeterminate"></div></div>' +
            '<span class="progress-pct">...</span></div>';
        } else {
          var fillClass = isDone ? 'progress-fill done' : 'progress-fill';
          progressHTML = '<div class="progress-wrap">' +
            '<div class="progress-bar"><div class="' + fillClass + '" style="width:' + job.progress + '%"></div></div>' +
            '<span class="progress-pct">' + job.progress + '%</span></div>';
        }

        return '<tr>' +
          '<td class="job-id">' + truncate(job.id, 16) + '</td>' +
          '<td class="po-id">' + truncate(job.purchaseOrderId, 14) + '</td>' +
          '<td>' + job.partId + '</td>' +
          '<td class="qty">' + job.quantity + '</td>' +
          '<td><span class="badge ' + badgeClass + '">' + job.status + '</span></td>' +
          '<td>' + progressHTML + '</td>' +
          '<td class="elapsed ' + (isDone ? 'done' : 'active') + '">' + elapsed + '</td>' +
          '<td class="detail">' + (job.detail || '') + '</td>' +
          '</tr>';
      }).join('');
    }

    function truncate(str, max) {
      if (!str) return '-';
      return str.length > max ? str.slice(0, max) + '...' : str;
    }

    function formatElapsed(startISO, endISO) {
      if (!startISO) return '-';
      var start = new Date(startISO);
      var end = endISO ? new Date(endISO) : new Date();
      var diff = Math.max(0, Math.floor((end - start) / 1000));
      var min = Math.floor(diff / 60);
      var sec = diff % 60;
      if (min > 0) return min + '\\uBD84 ' + sec + '\\uCD08';
      return sec + '\\uCD08';
    }

    fetchJobs();
    setInterval(fetchJobs, 2000);
    setInterval(function() {
      if (jobs.some(function(j) { return j.statusType !== 'done'; })) renderJobs();
    }, 1000);
  </script>
</body>
</html>`;
}

module.exports = { createDashboard };
