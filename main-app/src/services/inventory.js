const partsModel = require('../models/parts');
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

  // 임계치 이하 → 발주 생성
  const purchaseOrder = {
    purchaseOrderId: uuidv4(),
    partId,
    quantity: part.orderQuantity,
    status: 'ORDERED',
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
  const missingParts = {};

  // 1단계: 재고 차감 (반드시 전부 시도)
  for (const [partId, qty] of Object.entries(requiredParts)) {
    try {
      const updated = await partsModel.deductStock(partId, qty);
      results.push({ partId, success: true, remaining: updated.currentStock });
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        const part = await partsModel.getById(partId);
        missingParts[partId] = qty - (part?.currentStock || 0);
        results.push({ partId, success: false, missing: missingParts[partId] });
      } else {
        throw err;
      }
    }
  }

  // 2단계: 임계치 체크 → 자동 발주 (실패해도 차감에 영향 없음)
  for (const r of results) {
    try {
      await checkAndOrder(r.partId);
    } catch (err) {
      console.error(`[발주 체크 실패] ${r.partId}: ${err.message}`);
    }
  }

  const hasMissing = Object.keys(missingParts).length > 0;
  return { results, missingParts: hasMissing ? missingParts : null };
}

module.exports = { checkAndOrder, deductAndCheck };
