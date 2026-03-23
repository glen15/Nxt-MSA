const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { chaosMiddleware, chaosRouter } = require('../../shared/chaos');
const { publishReceivingMessage } = require('../../shared/snsPublisher');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(chaosMiddleware);
app.use('/admin', chaosRouter(express));

// 진행 중인 생산 작업
const jobs = new Map();

// 헬스 체크 — 엔진 공장은 /api/health
app.get('/api/health', (req, res) => {
  res.json({ factory: 'engine', status: 'running', activeJobs: jobs.size });
});

// 생산 요청 — POST /api/produce
// 엔진 공장의 고유 API (다른 공장과 의도적으로 다름)
app.post('/api/produce', async (req, res) => {
  const { purchaseOrderId, partId, quantity } = req.body;

  if (!purchaseOrderId || !partId || !quantity) {
    return res.status(400).json({ error: 'purchaseOrderId, partId, quantity 필수' });
  }

  const jobId = uuidv4();
  const job = {
    jobId,
    purchaseOrderId,
    partId,
    quantity,
    status: 'PRODUCING',
    startedAt: new Date().toISOString(),
  };

  jobs.set(jobId, job);
  console.log(`[엔진공장] 생산 시작: ${partId} × ${quantity} (jobId: ${jobId})`);

  // 비동기 생산 시뮬레이션 (3~8초)
  const delay = 3000 + Math.random() * 5000;
  setTimeout(async () => {
    job.status = 'COMPLETED';
    job.completedAt = new Date().toISOString();
    console.log(`[엔진공장] 생산 완료: ${partId} × ${quantity} (${Math.round(delay / 1000)}초)`);

    try {
      await publishReceivingMessage({
        purchaseOrderId,
        partId,
        quantity,
        factoryId: 'engine-factory',
      });
    } catch (err) {
      console.error('[엔진공장] SNS 발행 실패:', err.message);
    }
  }, delay);

  // 202 Accepted — 비동기 처리 시작됨
  res.status(202).json({
    jobId,
    message: '엔진 생산이 시작되었습니다.',
    estimatedSeconds: Math.round(delay / 1000),
  });
});

// 생산 상태 조회 — GET /api/status/:jobId
app.get('/api/status/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: '작업을 찾을 수 없습니다.' });
  }
  res.json(job);
});

app.listen(PORT, () => {
  console.log(`\n🔧 엔진 공장 서버 (포트: ${PORT})`);
  console.log(`   생산 요청: POST /api/produce`);
  console.log(`   상태 조회: GET /api/status/:jobId`);
  console.log(`   헬스 체크: GET /api/health`);
  console.log(`   장애 주입: POST /admin/chaos\n`);
});
