// SQS(주문상태큐) → 발주 상태 업데이트 Lambda
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PURCHASE_ORDERS_TABLE = process.env.PURCHASE_ORDERS_TABLE || 'PurchaseOrders';

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    // SQS → SNS wrapping 해제
    const snsMessage = JSON.parse(record.body);
    const message = JSON.parse(snsMessage.Message);

    console.log('[입고→상태] 메시지 수신:', JSON.stringify(message));

    const { purchaseOrderId, partId, quantity, factoryId } = message;

    try {
      const result = await docClient.send(
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
          ReturnValues: 'ALL_NEW',
        })
      );

      console.log(`[입고→상태] ${purchaseOrderId} → RECEIVED (${factoryId})`);
      results.push({ purchaseOrderId, status: 'RECEIVED', factoryId });
    } catch (err) {
      console.error(`[입고→상태] 실패: ${purchaseOrderId}`, err.message);
      throw err;
    }
  }

  return { processed: results.length, results };
};
