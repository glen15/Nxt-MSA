const { GetCommand, ScanCommand, UpdateCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const docClient = require('./dynamo');
const config = require('../config');

const TABLE = config.tables.parts;

async function getAll() {
  const { Items } = await docClient.send(new ScanCommand({ TableName: TABLE }));
  return Items || [];
}

async function getById(partId) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { partId } })
  );
  return Item;
}

async function deductStock(partId, quantity) {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { partId },
      UpdateExpression: 'SET currentStock = currentStock - :qty, updatedAt = :now',
      ConditionExpression: 'currentStock >= :qty',
      ExpressionAttributeValues: {
        ':qty': quantity,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes;
}

async function addStock(partId, quantity) {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { partId },
      UpdateExpression: 'SET currentStock = currentStock + :qty, updatedAt = :now',
      ExpressionAttributeValues: {
        ':qty': quantity,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes;
}

async function upsert(item) {
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function setOrderPending(partId, pending) {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { partId },
      UpdateExpression: 'SET orderPending = :p, updatedAt = :now',
      ExpressionAttributeValues: {
        ':p': pending,
        ':now': new Date().toISOString(),
      },
    })
  );
}

module.exports = { getAll, getById, deductStock, addStock, upsert, setOrderPending };
