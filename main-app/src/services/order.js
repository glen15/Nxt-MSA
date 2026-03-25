const { v4: uuidv4 } = require('uuid');
const ordersModel = require('../models/orders');
const { getRequiredParts } = require('./vehicleConfig');
const { deductAndCheck } = require('./inventory');

async function createOrder(vehicleModel) {
  const vehicle = getRequiredParts(vehicleModel);
  if (!vehicle) {
    throw new Error(`알 수 없는 차량 모델: ${vehicleModel}. sedan, ev, suv 중 선택하세요.`);
  }

  // 재고 차감 시도
  const { results, missingParts } = await deductAndCheck(vehicle.requiredParts);

  const now = new Date().toISOString();
  const status = missingParts ? 'WAITING_PARTS' : 'PARTS_ALLOCATED';
  const order = {
    orderId: uuidv4(),
    vehicleModel,
    vehicleType: vehicle.type,
    requiredParts: vehicle.requiredParts,
    status,
    createdAt: now,
    updatedAt: now,
  };

  if (missingParts) {
    order.missingParts = missingParts;
  }

  await ordersModel.create(order);
  console.log(`[주문] ${order.orderId} (${vehicle.label}) — ${status}`);

  return { ...order, stockResults: results };
}

module.exports = { createOrder };
