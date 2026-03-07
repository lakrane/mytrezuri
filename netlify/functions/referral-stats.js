const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    const clicks = await prisma.referralClick.count({ where: { referralCode: user.referralCode } });
    const signups = await prisma.user.count({ where: { referredBy: user.referralCode } });
    return {
      statusCode: 200,
      body: JSON.stringify({ clicks, signups, points: user.points })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};