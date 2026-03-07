const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    let items;
    if (user.role === 'admin') {
      items = await prisma.vaultItem.findMany({
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      items = await prisma.vaultItem.findMany({
        where: { userId: decoded.userId },
        orderBy: { createdAt: 'desc' }
      });
    }
    return { statusCode: 200, body: JSON.stringify(items) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};