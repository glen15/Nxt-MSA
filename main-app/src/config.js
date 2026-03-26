require('dotenv').config();

const prefix = process.env.USER_PREFIX || '';
const p = prefix ? `${prefix}-` : '';

const config = {
  userPrefix: prefix,
  port: process.env.APP_PORT || 3000,
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
  },
  tables: {
    parts: process.env.PARTS_TABLE || `${p}Parts`,
    orders: process.env.ORDERS_TABLE || `${p}Orders`,
    purchaseOrders: process.env.PURCHASE_ORDERS_TABLE || `${p}PurchaseOrders`,
  },
  sns: {
    orderingTopicArn: process.env.ORDERING_TOPIC_ARN || '',
    receivingTopicArn: process.env.RECEIVING_TOPIC_ARN || '',
  },
};

module.exports = config;
