const express = require('express');
const router = express.Router();
const ordersModel = require('../models/orders');
const { createOrder } = require('../services/order');
const { getVehicleModels } = require('../services/vehicleConfig');

// 차량 모델 목록 조회
router.get('/vehicle-models', (req, res) => {
  res.json({ models: getVehicleModels() });
});

// 전체 주문 조회
router.get('/', async (req, res) => {
  try {
    const orders = await ordersModel.getAll();
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: '주문 데이터를 불러올 수 없습니다.' });
  }
});

// 특정 주문 조회
router.get('/:orderId', async (req, res) => {
  try {
    const order = await ordersModel.getById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: '주문을 찾을 수 없습니다.' });
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: '주문 조회 실패' });
  }
});

// 주문 생성
router.post('/', async (req, res) => {
  const { vehicleModel } = req.body;
  if (!vehicleModel) {
    return res.status(400).json({ error: 'vehicleModel은 필수입니다. (sedan, ev, suv)' });
  }

  try {
    const result = await createOrder(vehicleModel);
    const statusCode = result.status === 'WAITING_PARTS' ? 202 : 201;
    res.status(statusCode).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
