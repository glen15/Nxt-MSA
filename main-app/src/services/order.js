const { v4: uuidv4 } = require('uuid');
const ordersModel = require('../models/orders');
const { getRequiredParts } = require('./vehicleConfig');
const { deductAndCheck } = require('./inventory');

async function createOrder(vehicleModel) {
  const vehicle = getRequiredParts(vehicleModel);
  if (!vehicle) {
    throw new Error(`알 수 없는 차량 모델: ${vehicleModel}. sedan, ev, suv 중 선택하세요.`);
  }

  const now = new Date().toISOString();
  const order = {
    orderId: uuidv4(),
    vehicleModel,
    vehicleType: vehicle.type,
    requiredParts: vehicle.requiredParts,
    status: 'RECEIVED',
    createdAt: now,
    updatedAt: now,
  };

  await ordersModel.create(order);
  console.log(`[주문] 생성: ${order.orderId} (${vehicle.label})`);

  // 재고 차감 시도
  const { results, missingParts } = await deductAndCheck(vehicle.requiredParts);

  if (missingParts) {
    await ordersModel.updateStatus(order.orderId, 'WAITING_PARTS', {
      ':missingParts': missingParts,
    });
    console.log(`[주문] 부품 부족 — 대기: ${order.orderId}`, missingParts);
    return { ...order, status: 'WAITING_PARTS', missingParts, stockResults: results };
  }

  await ordersModel.updateStatus(order.orderId, 'PARTS_ALLOCATED');
  console.log(`[주문] 부품 할당 완료: ${order.orderId}`);
  return { ...order, status: 'PARTS_ALLOCATED', stockResults: results };
}

module.exports = { createOrder };
