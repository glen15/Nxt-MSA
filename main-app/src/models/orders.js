const { GetCommand, ScanCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const docClient = require('./dynamo');
const config = require('../config');

const TABLE = config.tables.orders;

async function getAll() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE }));
  return Items || [];
}

async function getById(orderId) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { orderId } })
  );
  return Item;
}

async function create(order) {
  await docClient.send(new PutCommand({ TableName: TABLE, Item: order }));
  return order;
}

async function updateStatus(orderId, status, extra = {}) {
  const updates = { ':status': status, ':now': new Date().toISOString(), ...extra };
  const expressions = ['#s = :status', 'updatedAt = :now'];

  if (extra[':missingParts']) {
    expressions.push('missingParts = :missingParts');
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { orderId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: updates,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes;
}

module.exports = { getAll, getById, create, updateStatus };
