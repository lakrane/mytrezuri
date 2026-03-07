const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  try {
    const users = await prisma.user.findMany({
      where: { points: { gt: 0 } },
      orderBy: { points: 'desc' },
      take: 10,
      select: { username: true, points: true }
    });
    return { statusCode: 200, body: JSON.stringify(users) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};