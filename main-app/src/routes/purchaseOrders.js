const express = require('express');
const router = express.Router();
const purchaseOrdersModel = require('../models/purchaseOrders');

// 전체 발주 조회
router.get('/', async (req, res) => {
  const purchaseOrders = await purchaseOrdersModel.getAll();
  res.json({ purchaseOrders });
});

// 특정 발주 조회
router.get('/:purchaseOrderId', async (req, res) => {
  const po = await purchaseOrdersModel.getById(req.params.purchaseOrderId);
  if (!po) {
    return res.status(404).json({ error: '발주를 찾을 수 없습니다.' });
  }
  res.json({ purchaseOrder: po });
});

module.exports = router;
