const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const partsRouter = require('./routes/parts');
const ordersRouter = require('./routes/orders');
const purchaseOrdersRouter = require('./routes/purchaseOrders');

const app = express();

app.use(cors());
app.use(express.json());

// 프론트엔드 정적 파일 서빙 (빌드 결과물 또는 소스)
app.use(express.static(path.join(__dirname, '../../frontend/dist')));
app.use(express.static(path.join(__dirname, '../../frontend')));

// 라우트
app.use('/api/parts', partsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);

// 헬스 체크
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    timestamp: new Date().toISOString(),
    factories: config.factories,
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[에러]', err.message);
  res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

app.listen(config.port, () => {
  console.log(`\n🚗 차량 조립 공장 메인 앱서버`);
  console.log(`   포트: ${config.port}`);
  console.log(`   리전: ${config.aws.region}`);
  console.log(`   공장 엔진: ${config.factories.engine}`);
  console.log(`   공장 타이어: ${config.factories.tire}`);
  console.log(`   공장 배터리: ${config.factories.battery}`);
  console.log(`   SNS 발주토픽: ${config.sns.orderingTopicArn || '(미설정)'}`);
  console.log();
});
