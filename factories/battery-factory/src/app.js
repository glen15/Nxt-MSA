const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { chaosMiddleware, chaosRouter } = require('../../shared/chaos');
const { publishReceivingMessage } = require('../../shared/snsPublisher');
const { upsertJob } = require('../../shared/db');
const { createDashboard } = require('../../shared/dashboard');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(chaosMiddleware);
app.use('/admin', chaosRouter(express));

// 주문 저장소
const orderStore = new Map();

const stateInfo = {
  QUEUED: { name: '대기 중', progress: 0 },
  CHARGING_CELLS: { name: '셀 충전 중', progress: 33 },
  ASSEMBLING_PACK: { name: '팩 조립 중', progress: 66 },
  SHIPPED: { name: '출하 완료', progress: 100 },
};

// DB에 정규화된 작업 저장
function saveJob(j) {
  const info = stateInfo[j.state] || { name: j.state, progress: 50 };
  upsertJob({
    id: j.orderNumber,
    factory: 'battery',
    purchaseOrderId: j.purchaseOrderId,
    partId: j.partId,
    quantity: j.quantity,
    status: info.name,
    statusType: j.state === 'SHIPPED' ? 'done' : (j.state === 'QUEUED' ? 'waiting' : 'progress'),
    progress: info.progress,
    detail: info.name,
    requester: j.requester,
    startedAt: j.queuedAt,
    completedAt: j.shippedAt || null,
  });
}

// 대시보드 — 주문 현황 웹 페이지
app.use(createDashboard(express, {
  name: 'battery',
  displayName: '배터리 공장',
  emoji: '🔋',
  color: '#2ecc71',
}));

// 헬스 체크 — 배터리 공장은 /api/ping (또 다른 이름 — 교육 포인트)
app.get('/api/ping', (req, res) => {
  res.status(200).send('pong');
});

// 생산 요청 — POST /api/orders
// 배터리 공장의 고유 API (주문 접수 스타일)
app.post('/api/orders', async (req, res) => {
  const { purchaseOrderId, partId, quantity, requester } = req.body;

  if (!purchaseOrderId || !partId || !quantity) {
    return res.status(422).json({
      errors: [
        ...(!purchaseOrderId ? [{ field: 'purchaseOrderId', message: '필수 항목입니다' }] : []),
        ...(!partId ? [{ field: 'partId', message: '필수 항목입니다' }] : []),
        ...(!quantity ? [{ field: 'quantity', message: '필수 항목입니다' }] : []),
      ],
    });
  }

  const orderNumber = `BAT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const order = {
    orderNumber,
    purchaseOrderId,
    partId,
    quantity,
    requester,
    state: 'QUEUED',
    queuedAt: new Date().toISOString(),
  };

  orderStore.set(orderNumber, order);
  saveJob(order);
  console.log(`[배터리공장] 주문 접수: ${partId} × ${quantity} (${orderNumber})`);

  // 비동기 생산 — 배터리는 생산 시간이 김 (5~12초)
  const delay = 5000 + Math.random() * 7000;

  setTimeout(() => {
    order.state = 'CHARGING_CELLS';
    saveJob(order);
    console.log(`[배터리공장] 셀 충전 중: ${orderNumber}`);
  }, delay * 0.3);

  setTimeout(() => {
    order.state = 'ASSEMBLING_PACK';
    saveJob(order);
    console.log(`[배터리공장] 팩 조립 중: ${orderNumber}`);
  }, delay * 0.7);

  setTimeout(async () => {
    order.state = 'SHIPPED';
    order.shippedAt = new Date().toISOString();
    saveJob(order);
    console.log(`[배터리공장] 출하 완료: ${partId} × ${quantity} (${Math.round(delay / 1000)}초)`);

    try {
      await publishReceivingMessage({
        purchaseOrderId,
        partId,
        quantity,
        factoryId: 'battery-factory',
      });
    } catch (err) {
      console.error('[배터리공장] SNS 발행 실패:', err.message);
    }
  }, delay);

  // 200 OK — 접수 확인에 4초 소요 (Lambda 타임아웃 교육용)
  setTimeout(() => {
    res.status(200).json({
      orderNumber,
      accepted: true,
      estimatedMinutes: Math.round(delay / 60000 * 10) / 10,
    });
  }, 4000);
});

// 주문 상태 조회 — POST /api/orders/status (GET이 아닌 POST — 교육 포인트)
app.post('/api/orders/status', (req, res) => {
  const { orderNumber } = req.body;
  if (!orderNumber) {
    return res.status(400).json({ error: 'orderNumber 필수' });
  }

  const order = orderStore.get(orderNumber);
  if (!order) {
    return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
  }
  res.json(order);
});

app.listen(PORT, () => {
  console.log(`\n🔋 배터리 공장 서버 (포트: ${PORT})`);
  console.log(`   주문 접수: POST /api/orders`);
  console.log(`   상태 조회: POST /api/orders/status`);
  console.log(`   헬스 체크: GET /api/ping`);
  console.log(`   장애 주입: POST /admin/chaos\n`);
});
