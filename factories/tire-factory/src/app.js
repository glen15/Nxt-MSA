const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { chaosMiddleware, chaosRouter } = require('../../shared/chaos');
const { publishReceivingMessage } = require('../../shared/snsPublisher');
const { upsertJob, existsByPurchaseOrderId } = require('../../shared/db');
const { createDashboard } = require('../../shared/dashboard');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use(chaosMiddleware);
app.use('/admin', chaosRouter(express));

// 진행 중인 제조 작업
const manufacturingJobs = new Map();

const phaseNames = {
  MIXING_RUBBER: '고무 혼합', MOLDING: '성형',
  VULCANIZING: '가황', QUALITY_CHECK: '품질 검사', DONE: '완료',
};

// DB에 정규화된 작업 저장
function saveJob(j) {
  upsertJob({
    id: j.manufacturingId,
    factory: 'tire',
    purchaseOrderId: j.purchaseOrderId,
    partId: j.partId,
    quantity: j.quantity,
    status: j.phase === 'DONE' ? '완료' : (phaseNames[j.phase] || j.phase),
    statusType: j.phase === 'DONE' ? 'done' : 'progress',
    progress: j.progress,
    detail: phaseNames[j.phase] || j.phase,
    requester: j.requester,
    startedAt: j.createdAt,
    completedAt: j.completedAt || null,
  });
}

// 대시보드 — 제조 현황 웹 페이지
app.use(createDashboard(express, {
  name: 'tire',
  displayName: '타이어 공장',
  emoji: '🛞',
  color: '#3498db',
}));

// 헬스 체크 — 타이어 공장은 /api/health (같은 이름)
app.get('/api/health', (req, res) => {
  res.json({
    service: 'tire-manufacturing',
    healthy: true,
    jobCount: manufacturingJobs.size,
    uptime: process.uptime(),
  });
});

// 생산 요청 — POST /api/manufacture
// 타이어 공장의 고유 API (엔진 공장과 다른 엔드포인트명)
app.post('/api/manufacture', async (req, res) => {
  const { purchaseOrderId, partId, quantity, requester, callbackTopicArn } = req.body;

  if (!purchaseOrderId || !partId || !quantity) {
    return res.status(400).json({
      code: 'INVALID_REQUEST',
      message: 'purchaseOrderId, partId, quantity가 필요합니다.',
    });
  }

  if (existsByPurchaseOrderId(purchaseOrderId, 'tire')) {
    console.log(`[타이어공장] 중복 요청 무시: ${purchaseOrderId}`);
    return setTimeout(() => res.status(202).json({ message: '이미 처리된 발주입니다.', duplicate: true }), 4000);
  }

  const manufacturingId = `MFG-${uuidv4().slice(0, 8).toUpperCase()}`;
  const job = {
    manufacturingId,
    purchaseOrderId,
    partId,
    quantity,
    requester,
    phase: 'MIXING_RUBBER',
    progress: 0,
    createdAt: new Date().toISOString(),
  };

  manufacturingJobs.set(manufacturingId, job);
  saveJob(job);
  console.log(`[타이어공장] 제조 시작: ${partId} × ${quantity} (${manufacturingId}) [콜백: ${callbackTopicArn || '없음'}]`);

  // 비동기 생산 시뮬레이션 — 단계별 진행
  const phases = ['MIXING_RUBBER', 'MOLDING', 'VULCANIZING', 'QUALITY_CHECK', 'DONE'];
  let phaseIndex = 0;

  const interval = setInterval(async () => {
    phaseIndex++;
    if (phaseIndex >= phases.length) {
      clearInterval(interval);
      job.phase = 'DONE';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      saveJob(job);
      console.log(`[타이어공장] 제조 완료: ${partId} × ${quantity}`);

      try {
        await publishReceivingMessage({
          purchaseOrderId,
          partId,
          quantity,
          factoryId: 'tire-factory',
          callbackTopicArn,
        });
      } catch (err) {
        console.error('[타이어공장] SNS 발행 실패:', err.message);
      }
      return;
    }
    job.phase = phases[phaseIndex];
    job.progress = Math.round((phaseIndex / (phases.length - 1)) * 100);
    saveJob(job);
  }, 4000);

  // 202 Accepted — 접수 확인에 4초 소요 (Lambda 타임아웃 교육용)
  setTimeout(() => {
    res.status(202).json({
      manufacturingId,
      status: 'ACCEPTED',
      message: `타이어 ${quantity}개 제조가 시작되었습니다.`,
      trackUrl: `/api/jobs/${manufacturingId}`,
    });
  }, 4000);
});

// 제조 상태 조회 — GET /api/jobs/:manufacturingId
// (엔진 공장의 /api/status/:jobId와 경로가 다름 — 교육 포인트)
app.get('/api/jobs/:manufacturingId', (req, res) => {
  const job = manufacturingJobs.get(req.params.manufacturingId);
  if (!job) {
    return res.status(404).json({ code: 'NOT_FOUND', message: '제조 작업을 찾을 수 없습니다.' });
  }
  res.json(job);
});

app.listen(PORT, () => {
  console.log(`\n🛞 타이어 공장 서버 (포트: ${PORT})`);
  console.log(`   제조 요청: POST /api/manufacture`);
  console.log(`   상태 조회: GET /api/jobs/:manufacturingId`);
  console.log(`   헬스 체크: GET /api/health`);
  console.log(`   장애 주입: POST /admin/chaos\n`);
});
