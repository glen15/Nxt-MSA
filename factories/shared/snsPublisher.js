// 생산 완료 → SNS 입고 토픽 발행 (3개 공장 공통)
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const REGION = process.env.AWS_REGION || 'us-east-1';
const snsClient = new SNSClient({ region: REGION });

async function publishReceivingMessage({ purchaseOrderId, partId, quantity, factoryId, callbackTopicArn }) {
  if (!callbackTopicArn) {
    console.log('[SNS 미설정] 입고 메시지 스킵 (callbackTopicArn 없음):', { purchaseOrderId, partId, quantity });
    return null;
  }

  const message = {
    purchaseOrderId,
    partId,
    quantity,
    factoryId,
    producedAt: new Date().toISOString(),
  };

  const result = await snsClient.send(
    new PublishCommand({
      TopicArn: callbackTopicArn,
      Message: JSON.stringify(message),
      MessageAttributes: {
        partId: { DataType: 'String', StringValue: partId },
      },
    })
  );

  console.log(`[SNS] 입고 메시지 발행: ${partId} × ${quantity} → ${callbackTopicArn.split(':').pop()} (MessageId: ${result.MessageId})`);
  return result;
}

module.exports = { publishReceivingMessage };
