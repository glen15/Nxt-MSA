// SQS(재고큐) → DynamoDB 재고 충전 Lambda
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const PARTS_TABLE = process.env.PARTS_TABLE || 'Parts';

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    // SQS → SNS wrapping 해제
    const snsMessage = JSON.parse(record.body);
    const message = JSON.parse(snsMessage.Message);

    console.log('[입고→재고] 메시지 수신:', JSON.stringify(message));

    const { partId, quantity } = message;

    try {
      const result = await docClient.send(
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

      console.log(`[입고→재고] ${partId} +${quantity} → 현재: ${result.Attributes.currentStock}`);
      results.push({ partId, quantity, newStock: result.Attributes.currentStock });
    } catch (err) {
      console.error(`[입고→재고] 실패: ${partId}`, err.message);
      throw err;
    }
  }

  return { processed: results.length, results };
};
