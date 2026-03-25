const express = require('express');
const router = express.Router();
const partsModel = require('../models/parts');
const { checkAndOrder } = require('../services/inventory');
const { INITIAL_PARTS } = require('../services/seedData');

// 전체 부품 재고 조회
router.get('/', async (req, res) => {
  const parts = await partsModel.getAll();
  res.json({ parts });
});

// 재고 초기화 (시드 데이터로 리셋) — /:partId 보다 먼저 선언
router.post('/reset', async (req, res) => {
  const now = new Date().toISOString();
  for (const part of INITIAL_PARTS) {
    await partsModel.upsert({ ...part, updatedAt: now });
  }
  console.log('[리셋] 부품 재고 초기화 완료');
  res.json({ message: '재고가 초기화되었습니다.', parts: INITIAL_PARTS });
});

// 특정 부품 재고 조회
router.get('/:partId', async (req, res) => {
  const part = await partsModel.getById(req.params.partId);
  if (!part) {
    return res.status(404).json({ error: '부품을 찾을 수 없습니다.' });
  }
  res.json({ part });
});

// 수동 재고 체크 & 발주 트리거
router.post('/:partId/check', async (req, res) => {
  const result = await checkAndOrder(req.params.partId);
  if (!result) {
    return res.status(404).json({ error: '부품을 찾을 수 없습니다.' });
  }
  res.json(result);
});

module.exports = router;
