const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const config = require('../config');

const snsClient = new SNSClient({ region: config.aws.region });

async function publishOrderingMessage({ purchaseOrderId, partId, quantity, category }) {
  if (!config.sns.orderingTopicArn) {
    console.log('[SNS 미설정] 발주 메시지 스킵:', { purchaseOrderId, partId, quantity, category });
    return null;
  }

  const message = {
    purchaseOrderId,
    partId,
    quantity,
    category,
    callbackTopicArn: config.sns.receivingTopicArn,
    orderedAt: new Date().toISOString(),
  };

  const result = await snsClient.send(
    new PublishCommand({
      TopicArn: config.sns.orderingTopicArn,
      Message: JSON.stringify(message),
      MessageAttributes: {
        category: {
          DataType: 'String',
          StringValue: category,
        },
      },
    })
  );

  console.log(`[SNS] 발주 메시지 발행: ${partId} × ${quantity} (MessageId: ${result.MessageId})`);
  return result;
}

module.exports = { publishOrderingMessage };
