// SQS(엔진큐) → 엔진 공장 API 호출 Lambda
const http = require('http');

const ENGINE_FACTORY_URL = process.env.ENGINE_FACTORY_URL || 'http://localhost:3001';

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    // SQS → SNS wrapping 해제
    const snsEnvelope = JSON.parse(record.body);
    const message = JSON.parse(snsEnvelope.Message);
    console.log('[발주→엔진] 메시지 수신:', JSON.stringify(message));

    try {
      const response = await callFactory(`${ENGINE_FACTORY_URL}/api/produce`, {
        purchaseOrderId: message.purchaseOrderId,
        partId: message.partId,
        quantity: message.quantity,
      });

      console.log('[발주→엔진] 생산 요청 성공:', response);
      results.push({ messageId: record.messageId, status: 'success', response });
    } catch (err) {
      console.error('[발주→엔진] 생산 요청 실패:', err.message);
      throw err; // SQS 재시도를 위해 에러 전파
    }
  }

  return { processed: results.length, results };
};

function callFactory(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const data = JSON.stringify(body);

    const req = http.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': data.length },
        timeout: 25000,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => (responseData += chunk));
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
          } else {
            resolve(JSON.parse(responseData));
          }
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('요청 타임아웃'));
    });
    req.write(data);
    req.end();
  });
}
