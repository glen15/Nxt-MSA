const partsModel = require('../models/parts');
const config = require('../config');
const { publishOrderingMessage } = require('./messaging');
const { v4: uuidv4 } = require('uuid');
const purchaseOrdersModel = require('../models/purchaseOrders');

// 부품별 카테고리 매핑
const PART_CATEGORY = {
  'ENGINE-V6': 'engine',
  'TIRE-R18': 'tire',
  'BATTERY-72KWH': 'battery',
};

async function checkAndOrder(partId) {
  const part = await partsModel.getById(partId);
  if (!part) return null;

  if (part.currentStock > part.threshold) {
    return { needed: false, part };
  }

  // 이미 발주 진행 중이면 스킵 (orderPending 플래그)
  if (part.orderPending) {
    console.log(`[발주 스킵] ${partId} — 이미 발주 진행 중`);
    return { needed: false, part, alreadyOrdered: true };
  }

  // 임계치 이하 → 발주 진행 플래그 설정 + 발주 생성
  await partsModel.setOrderPending(partId, true);
  const hasSns = !!config.sns.orderingTopicArn;
  const purchaseOrder = {
    purchaseOrderId: uuidv4(),
    partId,
    quantity: part.orderQuantity,
    status: hasSns ? 'ORDERED' : 'PENDING',
    orderedAt: new Date().toISOString(),
  };

  await purchaseOrdersModel.create(purchaseOrder);

  // SNS 발행
  await publishOrderingMessage({
    purchaseOrderId: purchaseOrder.purchaseOrderId,
    partId,
    quantity: part.orderQuantity,
    category: PART_CATEGORY[partId] || partId.split('-')[0].toLowerCase(),
  });

  return { needed: true, part, purchaseOrder };
}

async function deductAndCheck(requiredParts) {
  const results = [];

  // 1단계: 재고 충분한지 사전 확인
  const missingParts = {};
  for (const [partId, qty] of Object.entries(requiredParts)) {
    const part = await partsModel.getById(partId);
    if (!part || part.currentStock < qty) {
      missingParts[partId] = qty - (part?.currentStock || 0);
    }
  }

  if (Object.keys(missingParts).length > 0) {
    // 재고 부족 — 차감 없이 발주 체크만
    for (const partId of Object.keys(requiredParts)) {
      try {
        await checkAndOrder(partId);
      } catch (err) {
        console.error(`[발주 체크 실패] ${partId}: ${err.message}`);
      }
    }
    return { results: Object.entries(requiredParts).map(([partId, qty]) => ({
      partId, success: false, missing: missingParts[partId] || 0,
    })), missingParts };
  }

  // 2단계: 전부 충분 → 일괄 차감
  for (const [partId, qty] of Object.entries(requiredParts)) {
    const updated = await partsModel.deductStock(partId, qty);
    results.push({ partId, success: true, remaining: updated.currentStock });
  }

  // 3단계: 임계치 체크 → 자동 발주
  for (const r of results) {
    try {
      await checkAndOrder(r.partId);
    } catch (err) {
      console.error(`[발주 체크 실패] ${r.partId}: ${err.message}`);
    }
  }

  return { results, missingParts: null };
}

module.exports = { checkAndOrder, deductAndCheck };
