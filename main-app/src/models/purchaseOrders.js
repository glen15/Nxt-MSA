const { GetCommand, ScanCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const docClient = require('./dynamo');
const config = require('../config');

const TABLE = config.tables.purchaseOrders;

async function getAll() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE }));
  return Items || [];
}

async function getById(purchaseOrderId) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { purchaseOrderId } })
  );
  return Item;
}

async function create(purchaseOrder) {
  await docClient.send(new PutCommand({ TableName: TABLE, Item: purchaseOrder }));
  return purchaseOrder;
}

async function updateStatus(purchaseOrderId, status, extra = {}) {
  const values = { ':status': status, ':now': new Date().toISOString() };
  const expressions = ['#s = :status', 'updatedAt = :now'];

  if (extra.factoryResponse) {
    values[':factoryResponse'] = extra.factoryResponse;
    expressions.push('factoryResponse = :factoryResponse');
  }
  if (status === 'RECEIVED' || status === 'FAILED') {
    values[':completedAt'] = new Date().toISOString();
    expressions.push('completedAt = :completedAt');
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { purchaseOrderId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes;
}

module.exports = { getAll, getById, create, updateStatus };
