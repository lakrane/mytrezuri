const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  try {
    const users = await prisma.user.findMany({
      select: { username: true, bio: true, fullName: true }
    });
    return { statusCode: 200, body: JSON.stringify(users) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};