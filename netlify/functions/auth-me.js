const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, fullName: true, bio: true, role: true, points: true, referralCode: true }
    });
    if (!user) throw new Error('User not found');
    return { statusCode: 200, body: JSON.stringify(user) };
  } catch (error) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }
};