// Lab용 통합 입고 Lambda — 재고 충전 + 발주 상태 업데이트를 한 함수에서 처리
// 미션: 이 Lambda를 receive-stock, update-order-status 두 개로 분리하세요
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PARTS_TABLE = process.env.PARTS_TABLE || 'Parts';
const PURCHASE_ORDERS_TABLE = process.env.PURCHASE_ORDERS_TABLE || 'PurchaseOrders';

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    // SQS → SNS wrapping 해제
    const snsEnvelope = JSON.parse(record.body);
    const message = JSON.parse(snsEnvelope.Message);

    const { purchaseOrderId, partId, quantity, factoryId } = message;
    console.log(`[입고] 메시지 수신: ${partId} × ${quantity} from ${factoryId}`, JSON.stringify(message));

    // 1. 재고 충전
    try {
      const stockResult = await docClient.send(
        new UpdateCommand({
          TableName: PARTS_TABLE,
          Key: { partId },
          UpdateExpression: 'SET currentStock = currentStock + :qty, updatedAt = :now',
          ExpressionAttributeValues: {
            ':qty': quantity,
            ':now': new Date().toISOString(),
          },
          ReturnValues: 'ALL_NEW',
        })
      );
      console.log(`[입고→재고] ${partId} +${quantity} → 현재: ${stockResult.Attributes.currentStock}`);
    } catch (err) {
      console.error(`[입고→재고] 실패: ${partId}`, err.message);
      throw err;
    }

    // 2. 발주 상태 RECEIVED로 업데이트
    try {
      await docClient.send(
        new UpdateCommand({
          TableName: PURCHASE_ORDERS_TABLE,
          Key: { purchaseOrderId },
          UpdateExpression: 'SET #s = :status, receivedAt = :now, factoryId = :fid, receivedQuantity = :qty',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: {
            ':status': 'RECEIVED',
            ':now': new Date().toISOString(),
            ':fid': factoryId,
            ':qty': quantity,
          },
        })
      );
      console.log(`[입고→상태] ${purchaseOrderId} → RECEIVED (${factoryId})`);
    } catch (err) {
      console.error(`[입고→상태] 실패: ${purchaseOrderId}`, err.message);
      throw err;
    }

    results.push({ partId, quantity, purchaseOrderId, factoryId });
  }

  return { processed: results.length, results };
};
