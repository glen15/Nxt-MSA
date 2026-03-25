const config = {
  port: process.env.APP_PORT || 3000,
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
  },
  tables: {
    parts: process.env.PARTS_TABLE || 'Parts',
    orders: process.env.ORDERS_TABLE || 'Orders',
    purchaseOrders: process.env.PURCHASE_ORDERS_TABLE || 'PurchaseOrders',
  },
  sns: {
    orderingTopicArn: process.env.ORDERING_TOPIC_ARN || '',
    receivingTopicArn: process.env.RECEIVING_TOPIC_ARN || '',
  },
  factories: {
    engine: process.env.ENGINE_FACTORY_URL || 'http://localhost:3001',
    tire: process.env.TIRE_FACTORY_URL || 'http://localhost:3002',
    battery: process.env.BATTERY_FACTORY_URL || 'http://localhost:3003',
  },
};

module.exports = config;
