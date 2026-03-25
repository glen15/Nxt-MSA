const express = require('express');
const cors = require('cors');
const config = require('./config');
const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const partsRouter = require('./routes/parts');
const ordersRouter = require('./routes/orders');
const purchaseOrdersRouter = require('./routes/purchaseOrders');

const app = express();

app.use(cors());
app.use(express.json());

// 라우트
app.use('/api/parts', partsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);

// API 루트
app.get('/', (req, res) => {
  res.json({
    service: 'NxtCar API',
    endpoints: {
      health: 'GET /api/health',
      parts: 'GET /api/parts',
      orders: 'GET /api/orders | POST /api/orders',
      purchaseOrders: 'GET /api/purchase-orders',
    },
  });
});

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[에러]', err.message);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

app.listen(config.port, async () => {
  console.log(`\n🚗 NxtCar 메인 앱서버 (포트: ${config.port})`);
  console.log(`   유저: ${config.userPrefix || '(미설정 — .env 파일 확인)'}`);
  console.log(`   리전: ${config.aws.region}\n`);

  // DynamoDB 테이블 연결 확인
  const dynamo = new DynamoDBClient({ region: config.aws.region });
  const tables = [
    { name: config.tables.parts, label: 'Parts' },
    { name: config.tables.orders, label: 'Orders' },
    { name: config.tables.purchaseOrders, label: 'PurchaseOrders' },
  ];

  console.log('   [DynamoDB]');
  for (const t of tables) {
    try {
      const res = await dynamo.send(new DescribeTableCommand({ TableName: t.name }));
      const count = res.Table.ItemCount;
      console.log(`   ✅ ${t.name} — 연결됨 (${count}건)`);
    } catch (err) {
      if (err.name === 'ResourceNotFoundException') {
        console.log(`   ❌ ${t.name} — 테이블 없음`);
      } else {
        console.log(`   ❌ ${t.name} — ${err.message}`);
      }
    }
  }

  // SNS 연결 상태
  console.log('\n   [SNS]');
  console.log(`   ${config.sns.orderingTopicArn ? '✅ 발주토픽: ' + config.sns.orderingTopicArn : '❌ 발주토픽 — 미설정'}`);

  console.log();
});
