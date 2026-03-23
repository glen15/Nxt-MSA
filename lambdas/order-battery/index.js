// SQS(배터리큐) → 배터리 공장 API 호출 Lambda
// 엔드포인트가 /api/orders — 같은 목적인데 경로가 다름 (어댑터 패턴)
const http = require('http');

const BATTERY_FACTORY_URL = process.env.BATTERY_FACTORY_URL || 'http://localhost:3003';

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    const message = JSON.parse(record.body);
    console.log('[발주→배터리] 메시지 수신:', JSON.stringify(message));

    try {
      const response = await callFactory(`${BATTERY_FACTORY_URL}/api/orders`, {
        purchaseOrderId: message.purchaseOrderId,
        partId: message.partId,
        quantity: message.quantity,
      });

      console.log('[발주→배터리] 주문 접수 성공:', response);
      results.push({ messageId: record.messageId, status: 'success', response });
    } catch (err) {
      console.error('[발주→배터리] 주문 접수 실패:', err.message);
      throw err;
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
