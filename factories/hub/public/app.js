var FACTORY_META = {
  engine:  { displayName: '엔진 공장',   emoji: '🔧', color: '#e74c3c' },
  tire:    { displayName: '타이어 공장', emoji: '🛞', color: '#3498db' },
  battery: { displayName: '배터리 공장', emoji: '🔋', color: '#2ecc71' }
};

var factories = [];
var activeTab = 'all';
var apiSubTab = 'all';
var jobPages = {};
var JOB_PAGE_SIZE = 20;

// 이벤트 위임
document.getElementById('tab-bar').addEventListener('click', function(e) {
  var tab = e.target.closest('[data-tab]');
  if (tab) { activeTab = tab.dataset.tab; renderTabs(); renderContent(); }
});

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('copy-btn')) { copyCode(e.target.dataset.id); }
  if (e.target.dataset.apiSub !== undefined) { apiSubTab = e.target.dataset.apiSub; renderContent(); }
  if (e.target.dataset.jobPage !== undefined) {
    var key = e.target.dataset.jobKey;
    jobPages[key] = parseInt(e.target.dataset.jobPage);
    renderContent();
  }
});

function fetchData() {
  fetch('/api/factories')
    .then(function(r) { return r.json(); })
    .then(function(data) { factories = data; renderTabs(); renderContent(); })
    .catch(function(e) { console.error(e); });
}

// ── 탭 렌더링 ──
function renderTabs() {
  var bar = document.getElementById('tab-bar');
  var totalIP = 0;
  factories.forEach(function(f) { totalIP += (f.stats ? f.stats.inProgress : 0); });

  var html = tab('all', '📊 전체', '#fff', totalIP > 0 ? totalIP : 0, '#3498db');
  factories.forEach(function(f) {
    var ip = f.stats ? f.stats.inProgress : 0;
    html += tab(f.name, f.emoji + ' ' + f.displayName, f.color, ip, f.color);
  });
  html += tab('api', '📋 API 문서', '#f39c12', 0, '#f39c12');
  html += tab('arch', '🧩 아키텍처', '#9b59b6', 0, '#9b59b6');
  bar.innerHTML = html;
}

function tab(name, label, color, badge, badgeColor) {
  var a = activeTab === name;
  var h = '<div class="tab' + (a ? ' active' : '') + '" data-tab="' + name +
    '" style="border-bottom-color:' + (a ? color : 'transparent') + '">' + label;
  if (badge > 0) h += ' <span class="badge-count" style="background:' + badgeColor + '30;color:' + badgeColor + '">' + badge + '</span>';
  return h + '</div>';
}

// ── 콘텐츠 렌더링 ──
function renderContent() {
  var el = document.getElementById('content');
  if (activeTab === 'all') el.innerHTML = renderOverview();
  else if (activeTab === 'api') el.innerHTML = renderApiDocs();
  else if (activeTab === 'arch') el.innerHTML = renderArchDocs();
  else {
    var f = factories.find(function(x) { return x.name === activeTab; });
    el.innerHTML = f ? renderFactory(f) : '';
  }
}

function renderOverview() {
  // 전체 통계
  var totalAll = 0, ipAll = 0, doneAll = 0;
  factories.forEach(function(f) {
    var s = f.stats || { total:0, inProgress:0, completed:0 };
    totalAll += s.total; ipAll += s.inProgress; doneAll += s.completed;
  });

  var html = '<div style="text-align:center;margin-bottom:1.5rem">' +
    '<div style="display:inline-flex;gap:2rem;background:#1e1e2e;border-radius:12px;padding:1rem 2rem">' +
      '<div><div style="font-size:2rem;font-weight:700">' + totalAll + '</div><div style="color:#888;font-size:0.8rem">전체 요청</div></div>' +
      '<div><div style="font-size:2rem;font-weight:700;color:#f39c12">' + ipAll + '</div><div style="color:#888;font-size:0.8rem">진행 중</div></div>' +
      '<div><div style="font-size:2rem;font-weight:700;color:#2ecc71">' + doneAll + '</div><div style="color:#888;font-size:0.8rem">완료</div></div>' +
    '</div></div>';

  // 공장별 카드
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">';
  factories.forEach(function(f) {
    var s = f.stats || { total:0, inProgress:0, completed:0 };
    var pct = s.total > 0 ? Math.round(s.completed / s.total * 100) : 0;
    var ipPct = s.total > 0 ? Math.round(s.inProgress / s.total * 100) : 0;

    // 도넛 차트 (CSS conic-gradient)
    var donut = s.total > 0
      ? 'background:conic-gradient(#2ecc71 0% ' + pct + '%, ' + f.color + ' ' + pct + '% ' + (pct + ipPct) + '%, #333 ' + (pct + ipPct) + '% 100%)'
      : 'background:#333';

    // 최근 작업 (최신 3개)
    var recent = (f.jobs || []).slice().sort(function(a, b) {
      return new Date(b.startedAt) - new Date(a.startedAt);
    }).slice(0, 3);

    var recentHtml = '';
    if (recent.length === 0) {
      recentHtml = '<div style="color:#555;font-size:0.8rem;text-align:center;padding:0.5rem">대기 중</div>';
    } else {
      recent.forEach(function(j) {
        var isDone = j.statusType === 'done';
        var icon = isDone ? '✅' : '⏳';
        var elapsed = formatElapsed(j.startedAt, j.completedAt);
        recentHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:0.3rem 0;border-bottom:1px solid #2a2a3e;font-size:0.75rem">' +
          '<span>' + icon + ' ' + (j.requester || '-') + '</span>' +
          '<span style="color:#888">' + (j.partId || '') + '</span>' +
          '<span style="color:' + (isDone ? '#2ecc71' : f.color) + '">' + elapsed + '</span>' +
        '</div>';
      });
    }

    html += '<div style="background:#1e1e2e;border-radius:12px;padding:1.2rem;border-top:3px solid ' + f.color + '">' +
      // 헤더
      '<div style="text-align:center;margin-bottom:1rem">' +
        '<div style="font-size:1.2rem;font-weight:700">' + f.emoji + ' ' + f.displayName + '</div>' +
      '</div>' +
      // 도넛 + 숫자
      '<div style="display:flex;align-items:center;justify-content:center;gap:1.5rem;margin-bottom:1rem">' +
        '<div style="position:relative;width:80px;height:80px">' +
          '<div style="width:80px;height:80px;border-radius:50%;' + donut + '"></div>' +
          '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:50px;height:50px;border-radius:50%;background:#1e1e2e;display:flex;align-items:center;justify-content:center">' +
            '<span style="font-size:1rem;font-weight:700">' + pct + '%</span>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:left">' +
          '<div style="margin-bottom:0.3rem"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#2ecc71;margin-right:0.4rem"></span><span style="color:#aaa;font-size:0.8rem">완료 </span><strong>' + s.completed + '</strong></div>' +
          '<div style="margin-bottom:0.3rem"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + f.color + ';margin-right:0.4rem"></span><span style="color:#aaa;font-size:0.8rem">진행 </span><strong>' + s.inProgress + '</strong></div>' +
          '<div><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#333;margin-right:0.4rem"></span><span style="color:#aaa;font-size:0.8rem">전체 </span><strong>' + s.total + '</strong></div>' +
        '</div>' +
      '</div>' +
      // 최근 작업
      '<div style="border-top:1px solid #2a2a3e;padding-top:0.6rem">' +
        '<div style="font-size:0.75rem;color:#666;margin-bottom:0.3rem">최근 작업</div>' +
        recentHtml +
      '</div>' +
    '</div>';
  });
  html += '</div>';
  return html;
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
  return stats + '<main>' + renderJobTable(jobs, false, f.name) + '</main>';
}

// ── 작업 테이블 ──
function renderJobTable(jobs, showFactory, pageKey) {
  if (jobs.length === 0) return '<div class="empty-state"><div class="icon">📦</div><div class="text">생산 요청이 없습니다</div></div>';

  var sorted = jobs.slice().sort(function(a, b) {
    if (a.statusType === 'done' && b.statusType !== 'done') return 1;
    if (a.statusType !== 'done' && b.statusType === 'done') return -1;
    return new Date(b.startedAt) - new Date(a.startedAt);
  });

  var key = pageKey || 'default';
  var totalPages = Math.ceil(sorted.length / JOB_PAGE_SIZE);
  var currentPage = Math.min(jobPages[key] || 1, totalPages || 1);
  jobPages[key] = currentPage;
  var paged = sorted.slice((currentPage - 1) * JOB_PAGE_SIZE, currentPage * JOB_PAGE_SIZE);

  var fth = showFactory ? '<th>공장</th>' : '';
  var html = '<div style="color:#888;font-size:0.8rem;margin-bottom:0.3rem">총 ' + sorted.length + '건</div>' +
    '<table><thead><tr>' + fth +
    '<th>요청자</th><th>작업 ID</th><th>발주 번호</th><th>부품</th>' +
    '<th style="text-align:center">수량</th><th>상태</th>' +
    '<th>진행률</th><th>요청 시각</th><th>경과 시간</th><th>상세</th></tr></thead><tbody>';

  paged.forEach(function(job) {
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
      '<td><strong>' + (job.requester || '-') + '</strong></td>' +
      '<td class="job-id" style="color:' + c + '">' + truncate(job.id, 16) + '</td>' +
      '<td class="job-id" style="color:#888">' + truncate(job.purchaseOrderId, 14) + '</td>' +
      '<td>' + (job.partId||'') + '</td>' +
      '<td class="qty">' + (job.quantity||0) + '</td>' +
      '<td><span class="badge ' + bc + '">' + (job.status||'') + '</span></td>' +
      '<td>' + ph + '</td>' +
      '<td style="font-size:0.75rem;color:#aaa">' + formatTime(job.startedAt) + '</td>' +
      '<td class="elapsed ' + (isDone ? 'done' : 'active') + '">' + elapsed + '</td>' +
      '<td class="detail">' + (job.detail||'') + '</td></tr>';
  });
  html += '</tbody></table>';
  if (totalPages > 1) {
    html += '<div style="display:flex;justify-content:center;align-items:center;gap:1rem;margin-top:0.5rem;font-size:0.85rem;color:#aaa">';
    if (currentPage > 1) html += '<button data-job-page="' + (currentPage - 1) + '" data-job-key="' + key + '" style="padding:0.3rem 0.8rem;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#ddd;cursor:pointer">◀ 이전</button>';
    html += '<span>' + currentPage + ' / ' + totalPages + '</span>';
    if (currentPage < totalPages) html += '<button data-job-page="' + (currentPage + 1) + '" data-job-key="' + key + '" style="padding:0.3rem 0.8rem;border:1px solid #555;border-radius:4px;background:#2a2a3e;color:#ddd;cursor:pointer">다음 ▶</button>';
    html += '</div>';
  }
  return html;
}

// ── API 문서 ──
function renderApiDocs() {
  var h = location.hostname;

  var subTabs = [
    { id: 'all', label: '📋 전체', color: '#f39c12' },
    { id: 'engine', label: '🔧 엔진', color: '#e74c3c' },
    { id: 'tire', label: '🛞 타이어', color: '#3498db' },
    { id: 'battery', label: '🔋 배터리', color: '#2ecc71' },
    { id: 'chaos', label: '💥 장애 주입', color: '#f39c12' }
  ];

  var html = '<div style="display:flex;gap:0.5rem;margin-bottom:1rem;flex-wrap:wrap">';
  subTabs.forEach(function(t) {
    var active = apiSubTab === t.id;
    html += '<button data-api-sub="' + t.id + '" style="padding:0.4rem 1rem;border:1px solid ' +
      (active ? t.color : '#555') + ';border-radius:6px;background:' +
      (active ? t.color + '22' : '#2a2a3e') + ';color:' +
      (active ? t.color : '#aaa') + ';cursor:pointer;font-size:0.85rem">' + t.label + '</button>';
  });
  html += '</div><div class="api-docs">';

  var sections = [
    {
      id: 'engine', name: '🔧 엔진 공장', port: 3001, color: '#e74c3c',
      endpoints: [
        { method: 'POST', path: '/api/produce', desc: '엔진 생산 요청 — 비동기 처리, 202 Accepted 반환',
          curl: 'curl -X POST http://HOST:3001/api/produce \\\n  -H "Content-Type: application/json" \\\n  -d \'{"purchaseOrderId":"PO-001","partId":"ENGINE-V6","quantity":10}\'',
          response: '{\n  "jobId": "be94e3ae-...",\n  "message": "엔진 생산이 시작되었습니다.",\n  "estimatedSeconds": 5\n}' },
        { method: 'GET', path: '/api/status/:jobId', desc: '생산 상태 조회',
          curl: 'curl http://HOST:3001/api/status/{jobId}',
          response: '{\n  "status": "PRODUCING" | "COMPLETED",\n  "partId": "ENGINE-V6",\n  "quantity": 10\n}' },
        { method: 'GET', path: '/api/health', desc: '헬스 체크',
          curl: 'curl http://HOST:3001/api/health', response: null }
      ]
    },
    {
      id: 'tire', name: '🛞 타이어 공장', port: 3002, color: '#3498db',
      endpoints: [
        { method: 'POST', path: '/api/manufacture', desc: '타이어 제조 요청 — 단계별 진행 (고무혼합→성형→가황→품질검사→완료)',
          curl: 'curl -X POST http://HOST:3002/api/manufacture \\\n  -H "Content-Type: application/json" \\\n  -d \'{"purchaseOrderId":"PO-002","partId":"TIRE-R18","quantity":40}\'',
          response: '{\n  "manufacturingId": "MFG-5AEC1D7E",\n  "status": "ACCEPTED",\n  "message": "타이어 40개 제조가 시작되었습니다.",\n  "trackUrl": "/api/jobs/MFG-5AEC1D7E"\n}' },
        { method: 'GET', path: '/api/jobs/:manufacturingId', desc: '제조 상태 조회 — progress 0~100%',
          curl: 'curl http://HOST:3002/api/jobs/{manufacturingId}',
          response: '{\n  "phase": "VULCANIZING",\n  "progress": 50\n}' },
        { method: 'GET', path: '/api/health', desc: '헬스 체크',
          curl: 'curl http://HOST:3002/api/health', response: null }
      ]
    },
    {
      id: 'battery', name: '🔋 배터리 공장', port: 3003, color: '#2ecc71',
      endpoints: [
        { method: 'POST', path: '/api/orders', desc: '배터리 주문 접수 — 200 OK 반환 (엔진/타이어와 다름!)',
          curl: 'curl -X POST http://HOST:3003/api/orders \\\n  -H "Content-Type: application/json" \\\n  -d \'{"purchaseOrderId":"PO-003","partId":"BATTERY-72KWH","quantity":5}\'',
          response: '{\n  "orderNumber": "BAT-1774419711461-IEK4",\n  "accepted": true,\n  "estimatedMinutes": 0.2\n}' },
        { method: 'POST', path: '/api/orders/status', desc: '주문 상태 조회 — GET이 아닌 POST! (교육 포인트)',
          curl: 'curl -X POST http://HOST:3003/api/orders/status \\\n  -H "Content-Type: application/json" \\\n  -d \'{"orderNumber":"BAT-1774419711461-IEK4"}\'',
          response: '{\n  "state": "QUEUED" | "CHARGING_CELLS" | "ASSEMBLING_PACK" | "SHIPPED"\n}' },
        { method: 'GET', path: '/api/ping', desc: '헬스 체크 — /api/health가 아님! (교육 포인트)',
          curl: 'curl http://HOST:3003/api/ping', response: 'pong' }
      ]
    },
    {
      id: 'chaos', name: '💥 장애 주입 API', port: null, color: '#f39c12', note: '3개 공장 공통',
      endpoints: [
        { method: 'POST', path: '/admin/chaos', desc: '장애 주입 — shutdown(503), delay(30s), error-rate(50%)',
          curl: '# 엔진 공장에 shutdown 장애 60초 주입\ncurl -X POST http://HOST:3001/admin/chaos \\\n  -H "Content-Type: application/json" \\\n  -d \'{"type":"shutdown","durationSeconds":60}\'',
          response: '{\n  "enabled": true,\n  "type": "shutdown",\n  "until": "2026-03-25T..."\n}' },
        { method: 'GET', path: '/admin/chaos', desc: '장애 상태 조회',
          curl: 'curl http://HOST:3001/admin/chaos', response: null },
        { method: 'DELETE', path: '/admin/chaos', desc: '장애 복구 (정상 상태로 되돌림)',
          curl: 'curl -X DELETE http://HOST:3001/admin/chaos',
          response: '{\n  "enabled": false,\n  "message": "정상 복구"\n}' }
      ]
    }
  ];

  var filtered = apiSubTab === 'all' ? sections : sections.filter(function(s) { return s.id === apiSubTab; });

  filtered.forEach(function(sec) {
    var portLabel = sec.port ? ':' + sec.port : '';
    var noteLabel = sec.note ? sec.note : '';
    html += '<div class="api-factory"><div class="api-factory-header" style="background:' + sec.color + '18">' +
      sec.name + ' <span style="font-size:0.8rem;color:#888;font-weight:400">' + (portLabel || noteLabel) + '</span></div>';

    sec.endpoints.forEach(function(ep, idx) {
      var mc = ep.method.toLowerCase();
      var curlId = sec.name.slice(0,1) + idx;
      var curlText = ep.curl.replace(/HOST/g, h);

      html += '<div class="api-endpoint">' +
        '<div class="api-endpoint-title">' +
          '<span class="method ' + mc + '">' + ep.method + '</span>' +
          '<span class="api-path">' + ep.path + '</span>' +
        '</div>' +
        '<div class="api-desc">' + ep.desc + '</div>' +
        '<div class="api-label">curl</div>' +
        '<div class="api-code" id="code-' + curlId + '"><pre>' + escHtml(curlText) + '</pre>' +
          '<button class="copy-btn" data-id="code-' + curlId + '">복사</button></div>';

      if (ep.response) {
        html += '<div class="api-label">응답 예시</div>' +
          '<div class="api-code"><pre>' + escHtml(ep.response) + '</pre></div>';
      }
      html += '</div>';
    });
    html += '</div>';
  });

  html += '</div>';
  return html;
}

// ── 아키텍처 탭 ──
function renderArchDocs() {
  var html = '<div class="api-docs"><div class="arch-section">' +
    '<h2 class="arch-title">왜 Lambda 어댑터 패턴이 필요한가?</h2>';

  // 비교 테이블
  html += '<h3 class="arch-subtitle">문제: 3개 공장 API가 전부 다르다</h3>' +
    '<table class="arch-table"><thead><tr>' +
    '<th></th><th style="color:#e74c3c">🔧 엔진</th><th style="color:#3498db">🛞 타이어</th><th style="color:#2ecc71">🔋 배터리</th>' +
    '</tr></thead><tbody>' +
    '<tr><td class="arch-label">생산 요청</td><td><code>POST /api/produce</code></td><td><code>POST /api/manufacture</code></td><td><code>POST /api/orders</code></td></tr>' +
    '<tr><td class="arch-label">응답 코드</td><td>202</td><td>202</td><td class="arch-diff">200</td></tr>' +
    '<tr><td class="arch-label">작업 ID 필드</td><td><code>jobId</code></td><td><code>manufacturingId</code></td><td><code>orderNumber</code></td></tr>' +
    '<tr><td class="arch-label">상태 조회</td><td>GET <code>/status/:id</code></td><td>GET <code>/jobs/:id</code></td><td class="arch-diff">POST <code>/orders/status</code></td></tr>' +
    '<tr><td class="arch-label">헬스 체크</td><td><code>/api/health</code></td><td><code>/api/health</code></td><td class="arch-diff"><code>/api/ping</code></td></tr>' +
    '</tbody></table>';

  // 통일된 계약
  html += '<h3 class="arch-subtitle">해결: 메인 앱은 하나의 메시지만 보낸다</h3>' +
    '<div class="arch-contract">' +
    '<div class="arch-contract-label">SNS 발주 메시지 (통일된 계약)</div>' +
    '<pre>{\n  "purchaseOrderId": "PO-2024-001",\n  "partId": "ENGINE-V6",\n  "quantity": 100\n}</pre>' +
    '</div>' +
    '<p class="arch-text">메인 앱은 공장이 몇 개든, API가 어떻게 생겼든 <strong>모릅니다.</strong> SNS 토픽에 통일된 메시지를 발행할 뿐입니다.</p>';

  // 흐름도
  html += '<h3 class="arch-subtitle">Lambda가 번역기(Adapter) 역할</h3>' +
    '<div class="arch-flow">' +
    '<div class="arch-flow-row">' +
      '<div class="arch-flow-box" style="border-color:#fff">메인 앱<br><small>통일된 메시지</small></div>' +
      '<div class="arch-flow-arrow">→</div>' +
      '<div class="arch-flow-box" style="border-color:#f39c12">SNS<br><small>발주 토픽</small></div>' +
      '<div class="arch-flow-arrow">→</div>' +
      '<div class="arch-flow-box" style="border-color:#9b59b6">SQS<br><small>부품별 큐</small></div>' +
      '<div class="arch-flow-arrow">→</div>' +
      '<div class="arch-flow-box" style="border-color:#3498db">Lambda<br><small>어댑터</small></div>' +
      '<div class="arch-flow-arrow">→</div>' +
      '<div class="arch-flow-box" style="border-color:#e74c3c">공장 API<br><small>각자 다름</small></div>' +
    '</div></div>';

  // 각 어댑터 역할
  html += '<div class="arch-adapters">' +
    '<div class="arch-adapter" style="border-left-color:#e74c3c">' +
      '<strong>order-engine Lambda</strong>' +
      '<span class="arch-adapter-flow"><code>{ partId, quantity }</code> → POST <code>/api/produce</code> → 202 처리</span></div>' +
    '<div class="arch-adapter" style="border-left-color:#3498db">' +
      '<strong>order-tire Lambda</strong>' +
      '<span class="arch-adapter-flow"><code>{ partId, quantity }</code> → POST <code>/api/manufacture</code> → progress 추적</span></div>' +
    '<div class="arch-adapter" style="border-left-color:#2ecc71">' +
      '<strong>order-battery Lambda</strong>' +
      '<span class="arch-adapter-flow"><code>{ partId, quantity }</code> → POST <code>/api/orders</code> → 200 처리</span></div>' +
    '</div>';

  // 이점
  html += '<h3 class="arch-subtitle">이 구조의 이점 (느슨한 결합)</h3>' +
    '<div class="arch-benefits">' +
    '<div class="arch-benefit">' +
      '<div class="arch-benefit-icon">🏭</div>' +
      '<div><strong>공장 추가</strong><br>Lambda + SQS 구독만 추가. 메인 앱 코드 변경 없음</div></div>' +
    '<div class="arch-benefit">' +
      '<div class="arch-benefit-icon">🔄</div>' +
      '<div><strong>공장 API 변경</strong><br>해당 Lambda만 수정. 다른 공장, 메인 앱 영향 없음</div></div>' +
    '<div class="arch-benefit">' +
      '<div class="arch-benefit-icon">💥</div>' +
      '<div><strong>공장 다운</strong><br>SQS에 메시지 적체 → 복구 후 자동 처리. 메인 앱은 정상 동작</div></div>' +
    '<div class="arch-benefit">' +
      '<div class="arch-benefit-icon">📨</div>' +
      '<div><strong>실패 처리</strong><br>DLQ(Dead Letter Queue)로 실패 메시지 격리 → Redrive로 재처리</div></div>' +
    '</div>';

  // 만약 없다면
  html += '<h3 class="arch-subtitle">Lambda 어댑터가 없다면?</h3>' +
    '<div class="arch-without">' +
    '<div class="arch-without-item"><span class="arch-x">✗</span> 메인 앱이 3개 공장의 URL, 엔드포인트, 인증 방식을 <b>전부 알아야</b> 함</div>' +
    '<div class="arch-without-item"><span class="arch-x">✗</span> 공장 하나 추가/변경 시 메인 앱 코드 수정 + 재배포 필요</div>' +
    '<div class="arch-without-item"><span class="arch-x">✗</span> 공장 다운 시 메인 앱도 함께 장애 (동기 호출이므로)</div>' +
    '<div class="arch-without-item"><span class="arch-x">✗</span> 실패 재처리 로직을 메인 앱에 직접 구현해야 함</div>' +
    '</div>';

  html += '</div></div>';
  return html;
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyCode(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var pre = el.querySelector('pre');
  var text = pre ? pre.textContent : el.textContent;
  navigator.clipboard.writeText(text).then(function() {
    var btn = el.querySelector('.copy-btn');
    if (btn) { btn.textContent = '✓'; setTimeout(function() { btn.textContent = '복사'; }, 1500); }
  });
}

// ── 유틸 ──
function truncate(s, max) {
  if (!s) return '-';
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function formatTime(iso) {
  if (!iso) return '-';
  var d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

// ── 시작 ──
fetchData();
setInterval(fetchData, 2000);
setInterval(function() {
  if (factories.some(function(f) { return f.stats && f.stats.inProgress > 0; })) renderContent();
}, 1000);
