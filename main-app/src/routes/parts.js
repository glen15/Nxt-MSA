const express = require('express');
const router = express.Router();
const partsModel = require('../models/parts');
const { checkAndOrder } = require('../services/inventory');

// 전체 부품 재고 조회
router.get('/', async (req, res) => {
  const parts = await partsModel.getAll();
  res.json({ parts });
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
