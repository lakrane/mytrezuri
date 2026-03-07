// This is a simplified in‑memory chat; for production use a proper pub/sub like Pusher or WebSockets.
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
// In‑memory store (not persisted across function restarts)
const messages = [];

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { partner, since } = JSON.parse(event.body);

    const filtered = messages.filter(m =>
      (m.sender === decoded.userId && m.receiver === partner) ||
      (m.sender === partner && m.receiver === decoded.userId)
    );

    return { statusCode: 200, body: JSON.stringify(filtered) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};