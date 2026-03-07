const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
// This would need a real presence system; for demo, return all users.
exports.handler = async (event) => {
  try {
    const users = await prisma.user.findMany({
      select: { username: true }
    });
    return { statusCode: 200, body: JSON.stringify(users) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};