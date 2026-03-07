const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, password } = JSON.parse(event.body);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return { statusCode: 401, body: 'User not found' };

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Incorrect password' }) };
    }

    const item = await prisma.vaultItem.findUnique({ where: { id } });
    if (!item) return { statusCode: 404, body: 'Not found' };
    if (item.userId !== decoded.userId && user.role !== 'admin') {
      return { statusCode: 403, body: 'Forbidden' };
    }

    await prisma.vaultItem.delete({ where: { id } });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};