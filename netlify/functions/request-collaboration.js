const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { itemId } = JSON.parse(event.body);
    const item = await prisma.vaultItem.findUnique({ where: { id: itemId } });
    if (!item) return { statusCode: 404, body: 'Item not found' };

    await prisma.collaboration.create({
      data: {
        itemId,
        initiatorId: decoded.userId,
        participantId: item.userId,
        status: 'pending'
      }
    });

    await prisma.notification.create({
      data: {
        userId: item.userId,
        type: 'collaboration',
        message: `User ${decoded.userId} wants to collaborate on your item "${item.title}".`
      }
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};