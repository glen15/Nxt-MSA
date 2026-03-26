// Lab용 통합 발주 Lambda — SQS 메시지의 category로 공장을 라우팅
// 미션: 이 Lambda를 부품별 개별 Lambda(order-engine, order-tire, order-battery)로 분리하세요
const http = require('http');

const FACTORIES = {
  engine: {
    url: process.env.ENGINE_FACTORY_URL || 'http://localhost:3001',
    path: '/api/produce',
    label: '엔진',
  },
  tire: {
    url: process.env.TIRE_FACTORY_URL || 'http://localhost:3002',
    path: '/api/manufacture',
    label: '타이어',
  },
  battery: {
    url: process.env.BATTERY_FACTORY_URL || 'http://localhost:3003',
    path: '/api/orders',
    label: '배터리',
  },
};

exports.handler = async (event) => {
  const results = [];

  for (const record of event.Records) {
    // SQS → SNS wrapping 해제
    const snsEnvelope = JSON.parse(record.body);
    const message = JSON.parse(snsEnvelope.Message);

    const { category, purchaseOrderId, partId, quantity, requester } = message;
    const factory = FACTORIES[category];

    if (!factory) {
      console.error(`[발주] 알 수 없는 카테고리: ${category}`);
      continue;
    }

    console.log(`[발주→${factory.label}] 메시지 수신:`, JSON.stringify(message));

    try {
      const response = await callFactory(`${factory.url}${factory.path}`, {
        purchaseOrderId,
        partId,
        quantity,
        requester,
      });

      console.log(`[발주→${factory.label}] 요청 성공:`, response);
      results.push({ messageId: record.messageId, status: 'success', response });
    } catch (err) {
      console.error(`[발주→${factory.label}] 요청 실패:`, err.message);
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
