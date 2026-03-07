const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const messages = []; // same in‑memory store

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { to, message } = JSON.parse(event.body);

    messages.push({
      id: Date.now(),
      sender: decoded.userId,
      receiver: to,
      message,
      timestamp: new Date().toISOString()
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};