var FACTORY_META = {
  engine:  { displayName: '엔진 공장',   emoji: '🔧', color: '#e74c3c' },
  tire:    { displayName: '타이어 공장', emoji: '🛞', color: '#3498db' },
  battery: { displayName: '배터리 공장', emoji: '🔋', color: '#2ecc71' }
};

var factories = [];
var activeTab = 'all';

// 이벤트 위임
document.getElementById('tab-bar').addEventListener('click', function(e) {
  var tab = e.target.closest('[data-tab]');
  if (tab) { activeTab = tab.dataset.tab; renderTabs(); renderContent(); }
});

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('copy-btn')) { copyCode(e.target.dataset.id); }
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

// ── 작업 테이블 ──
function renderJobTable(jobs, showFactory) {
  if (jobs.length === 0) return '<div class="empty-state"><div class="icon">📦</div><div class="text">생산 요청이 없습니다</div></div>';

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

// ── API 문서 ──
function renderApiDocs() {
  var h = location.hostname;
  var html = '<div class="api-docs">';

  var sections = [
    {
      name: '🔧 엔진 공장', port: 3001, color: '#e74c3c',
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
      name: '🛞 타이어 공장', port: 3002, color: '#3498db',
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
      name: '🔋 배터리 공장', port: 3003, color: '#2ecc71',
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
      name: '💥 장애 주입 API', port: null, color: '#f39c12', note: '3개 공장 공통',
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

  sections.forEach(function(sec) {
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
