const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { fullName, bio } = JSON.parse(event.body);
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: { fullName, bio }
    });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};