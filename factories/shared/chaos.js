// 장애 주입 미들웨어 (3개 공장 공통)
let chaosState = { enabled: false };

function chaosMiddleware(req, res, next) {
  // /admin, 대시보드 경로는 장애 영향 안 받음
  if (req.path.startsWith('/admin') || req.path.startsWith('/dashboard') || req.path === '/') return next();

  if (!chaosState.enabled) return next();

  // 만료 체크
  if (chaosState.until && new Date() > new Date(chaosState.until)) {
    chaosState = { enabled: false };
    return next();
  }

  switch (chaosState.type) {
    case 'shutdown':
      return res.status(503).json({ error: '서버 점검 중입니다.' });

    case 'delay':
      return setTimeout(() => next(), chaosState.delayMs || 30000);

    case 'error-rate':
      if (Math.random() < (chaosState.errorRate || 0.5)) {
        return res.status(500).json({ error: '내부 서버 오류 (장애 주입)' });
      }
      return next();

    default:
      return next();
  }
}

function chaosRouter(express) {
  const router = express.Router();

  router.get('/chaos', (req, res) => {
    if (!chaosState.enabled) {
      return res.json({ enabled: false });
    }
    const remaining = chaosState.until
      ? Math.max(0, Math.round((new Date(chaosState.until) - new Date()) / 1000))
      : null;
    res.json({ ...chaosState, remaining });
  });

  router.post('/chaos', (req, res) => {
    const { type, durationSeconds = 60, delayMs = 30000, errorRate = 0.5 } = req.body;

    if (!['shutdown', 'delay', 'error-rate'].includes(type)) {
      return res.status(400).json({ error: 'type은 shutdown, delay, error-rate 중 하나' });
    }

    const until = new Date(Date.now() + durationSeconds * 1000).toISOString();
    chaosState = { enabled: true, type, until, delayMs, errorRate };

    console.log(`[CHAOS] 장애 주입: ${type}, ${durationSeconds}초`);
    res.json({ enabled: true, type, until });
  });

  router.delete('/chaos', (req, res) => {
    chaosState = { enabled: false };
    console.log('[CHAOS] 정상 복구');
    res.json({ enabled: false, message: '정상 복구' });
  });

  return router;
}

module.exports = { chaosMiddleware, chaosRouter };
