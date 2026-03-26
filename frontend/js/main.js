// ─── API 설정 ───
const API_BASE = import.meta.env.VITE_API_BASE || '';

// ─── API 클라이언트 ───
async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok && res.status >= 500) throw new Error(data.error || `${res.status}`);
  return { status: res.status, data };
}

async function checkHealth() {
  try {
    const data = await apiGet('/api/health');
    return data.status === 'running';
  } catch {
    return false;
  }
}

// ─── 앱 초기화 ───
document.addEventListener('DOMContentLoaded', init);

let refreshInterval;
let ordersPage = 1;
let purchaseOrdersPage = 1;
const PAGE_SIZE = 20;

async function init() {
  await updateConnectionStatus();
  await refreshAll();
  refreshInterval = setInterval(refreshAll, 5000);
}

async function updateConnectionStatus() {
  const badge = document.getElementById('connection-status');
  const connected = await checkHealth();
  badge.className = `status-badge ${connected ? 'connected' : 'disconnected'}`;
  badge.textContent = connected ? '서버 연결됨' : '서버 연결 실패';
}

async function refreshAll() {
  await Promise.all([loadParts(), loadOrders(), loadPurchaseOrders(), loadReceiving()]);
  await updateConnectionStatus();
}

// ─── 부품 재고 ───
async function loadParts() {
  const container = document.getElementById('parts-grid');
  try {
    const { parts } = await apiGet('/api/parts');
    if (!parts.length) {
      container.innerHTML = '<div class="empty">부품 데이터가 없습니다.</div>';
      return;
    }
    container.innerHTML = parts.map(renderPartCard).join('');
  } catch {
    container.innerHTML = '<div class="empty">재고 데이터를 불러올 수 없습니다.</div>';
  }
}

function renderPartCard(part) {
  const ratio = part.currentStock / (part.threshold * 5);
  const pct = Math.min(100, Math.round(ratio * 100));
  const level = part.currentStock <= part.threshold ? 'danger' : pct < 50 ? 'warning' : 'healthy';
  const isLow = part.currentStock <= part.threshold;

  return `
    <div class="part-card ${isLow ? 'low-stock' : ''}">
      <div class="part-name">${partLabel(part.partId)}</div>
      <div class="part-id">${part.partId}</div>
      <div class="stock-bar"><div class="stock-bar-fill ${level}" style="width:${pct}%"></div></div>
      <div class="stock-numbers">
        <span class="stock-current">${part.currentStock}개</span>
        <span class="stock-threshold">임계치: ${part.threshold}</span>
      </div>
      ${isLow ? '<div style="color:#e53e3e;font-size:0.8rem;margin-top:0.3rem">⚠️ 재고 부족 — 자동 발주 진행</div>' : ''}
    </div>
  `;
}

function partLabel(partId) {
  const labels = { 'ENGINE-V6': '🔧 V6 엔진', 'TIRE-R18': '🛞 R18 타이어', 'BATTERY-72KWH': '🔋 72kWh 배터리' };
  return labels[partId] || partId;
}

// ─── 주문 생성 ───
async function createOrder(vehicleModel) {
  const btns = document.querySelectorAll('.vehicle-btn');
  btns.forEach((b) => (b.disabled = true));

  try {
    const { status, data } = await apiPost('/api/orders', { vehicleModel });
    if (status === 201) {
      showToast(`주문 완료! (${data.orderId.slice(0, 8)}...)`, 'success');
    } else if (status === 202) {
      showToast(`⚠️ 재고 부족 — 부품 입고 대기 중 (${data.orderId.slice(0, 8)}...)`, 'error');
    } else {
      showToast(`주문 생성: ${data.orderId?.slice(0, 8) || '확인'}`, 'success');
    }
    await refreshAll();
  } catch (err) {
    showToast(`주문 실패: ${err.message}`, 'error');
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

window.createOrder = createOrder;

// ─── 재고 초기화 ───
async function resetStock() {
  if (!confirm('재고를 초기값으로 되돌리시겠습니까?')) return;
  try {
    await apiPost('/api/parts/reset', {});
    showToast('재고가 초기화되었습니다.', 'success');
    await refreshAll();
  } catch (err) {
    showToast(`초기화 실패: ${err.message}`, 'error');
  }
}

window.resetStock = resetStock;

// ─── 주문 목록 ───
async function loadOrders() {
  const container = document.getElementById('orders-list');
  try {
    const { orders } = await apiGet('/api/orders');
    if (!orders.length) {
      container.innerHTML = '<div class="empty">주문이 없습니다.</div>';
      return;
    }
    const sorted = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    ordersPage = Math.min(ordersPage, totalPages);
    const paged = sorted.slice((ordersPage - 1) * PAGE_SIZE, ordersPage * PAGE_SIZE);
    container.innerHTML = `
      <table>
        <thead><tr><th>주문 ID</th><th>차량</th><th>타입</th><th>상태</th><th>시간</th></tr></thead>
        <tbody>${paged.map(renderOrderRow).join('')}</tbody>
      </table>
      ${totalPages > 1 ? renderPagination(ordersPage, totalPages, 'orders') : ''}
    `;
  } catch {
    container.innerHTML = '<div class="empty">주문 데이터를 불러올 수 없습니다.</div>';
  }
}

function renderOrderRow(order) {
  const badge = statusBadge(order.status);
  const vehicleLabels = { sedan: '🚗 세단', ev: '⚡ 전기차', suv: '🚙 SUV' };
  const typeLabels = { ice: '내연기관', ev: '전기', hybrid: '하이브리드' };
  const time = new Date(order.createdAt).toLocaleTimeString('ko-KR');

  return `
    <tr>
      <td><code>${order.orderId.slice(0, 8)}</code></td>
      <td>${vehicleLabels[order.vehicleModel] || order.vehicleModel}</td>
      <td>${typeLabels[order.vehicleType] || order.vehicleType}</td>
      <td>${badge}</td>
      <td>${time}</td>
    </tr>
  `;
}

// ─── 발주 현황 ───
async function loadPurchaseOrders() {
  const container = document.getElementById('purchase-orders-list');
  try {
    const { purchaseOrders } = await apiGet('/api/purchase-orders');
    if (!purchaseOrders.length) {
      container.innerHTML = '<div class="empty">발주 내역이 없습니다.</div>';
      return;
    }
    const sorted = purchaseOrders.sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt));
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    purchaseOrdersPage = Math.min(purchaseOrdersPage, totalPages);
    const paged = sorted.slice((purchaseOrdersPage - 1) * PAGE_SIZE, purchaseOrdersPage * PAGE_SIZE);
    container.innerHTML = `
      <table>
        <thead><tr><th>발주 ID</th><th>부품</th><th>수량</th><th>상태</th><th>시간</th></tr></thead>
        <tbody>${paged.map(renderPurchaseOrderRow).join('')}</tbody>
      </table>
      ${totalPages > 1 ? renderPagination(purchaseOrdersPage, totalPages, 'purchaseOrders') : ''}
    `;
  } catch {
    container.innerHTML = '<div class="empty">발주 데이터를 불러올 수 없습니다.</div>';
  }
}

function renderPurchaseOrderRow(po) {
  const badge = statusBadge(po.status);
  const time = new Date(po.orderedAt).toLocaleTimeString('ko-KR');

  return `
    <tr>
      <td><code>${po.purchaseOrderId.slice(0, 8)}</code></td>
      <td>${partLabel(po.partId)}</td>
      <td>${po.quantity}</td>
      <td>${badge}</td>
      <td>${time}</td>
    </tr>
  `;
}

// ─── 최근 입고 ───
async function loadReceiving() {
  const container = document.getElementById('receiving-list');
  try {
    const { purchaseOrders } = await apiGet('/api/purchase-orders');
    const received = purchaseOrders
      .filter(po => po.status === 'RECEIVED')
      .sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    if (!received.length) {
      container.innerHTML = '<div class="empty">입고 내역이 없습니다.</div>';
      return;
    }

    container.innerHTML = `
      <table>
        <thead><tr><th>부품</th><th>수량</th><th>공장</th><th>입고 시각</th></tr></thead>
        <tbody>${received.slice(0, 20).map(renderReceivingRow).join('')}</tbody>
      </table>
    `;
  } catch {
    container.innerHTML = '<div class="empty">입고 데이터를 불러올 수 없습니다.</div>';
  }
}

function renderReceivingRow(po) {
  const time = po.receivedAt ? new Date(po.receivedAt).toLocaleTimeString('ko-KR') : '-';
  const factoryLabels = { 'engine-factory': '🔧 엔진', 'tire-factory': '🛞 타이어', 'battery-factory': '🔋 배터리' };
  return `
    <tr>
      <td>${partLabel(po.partId)}</td>
      <td><strong>+${po.receivedQuantity || po.quantity}</strong></td>
      <td>${factoryLabels[po.factoryId] || po.factoryId || '-'}</td>
      <td>${time}</td>
    </tr>
  `;
}

// ─── 페이지네이션 ───
function renderPagination(current, total, type) {
  const prev = current > 1 ? `<button onclick="changePage('${type}', ${current - 1})">◀ 이전</button>` : '';
  const next = current < total ? `<button onclick="changePage('${type}', ${current + 1})">다음 ▶</button>` : '';
  return `<div class="pagination">${prev} <span>${current} / ${total}</span> ${next}</div>`;
}

function changePage(type, page) {
  if (type === 'orders') { ordersPage = page; loadOrders(); }
  else { purchaseOrdersPage = page; loadPurchaseOrders(); }
}

window.changePage = changePage;

// ─── 유틸 ───
function statusBadge(status) {
  const map = {
    PARTS_ALLOCATED: ['allocated', '부품 할당'],
    WAITING_PARTS: ['waiting', '부품 대기'],
    ASSEMBLING: ['allocated', '조립 중'],
    COMPLETED: ['completed', '완료'],
    ORDERED: ['ordered', '발주됨'],
    RECEIVED: ['completed', '입고 완료'],
    PENDING: ['waiting', '발주 대기 (SNS 미연결)'],
    FAILED: ['failed', '실패'],
  };
  const [cls, label] = map[status] || ['', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
