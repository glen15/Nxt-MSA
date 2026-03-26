const express = require('express');
const router = express.Router();
const purchaseOrdersModel = require('../models/purchaseOrders');

// 전체 발주 조회
router.get('/', async (req, res) => {
  try {
    const purchaseOrders = await purchaseOrdersModel.getAll();
    res.json({ purchaseOrders });
  } catch (err) {
    console.error('[발주 조회 실패]', err.message);
    res.status(500).json({ error: '발주 데이터를 불러올 수 없습니다.', detail: err.message });
  }
});

// 특정 발주 조회
router.get('/:purchaseOrderId', async (req, res) => {
  try {
    const po = await purchaseOrdersModel.getById(req.params.purchaseOrderId);
    if (!po) {
      return res.status(404).json({ error: '발주를 찾을 수 없습니다.' });
    }
    res.json({ purchaseOrder: po });
  } catch (err) {
    console.error('[발주 조회 실패]', err.message);
    res.status(500).json({ error: '발주 조회 실패', detail: err.message });
  }
});

module.exports = router;
