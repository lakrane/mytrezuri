const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  try {
    const items = await prisma.vaultItem.findMany({
      where: { visibility: 'public' },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' }
    });
    const formatted = items.map(i => ({
      id: i.id,
      title: i.title,
      description: i.description,
      likes: i.likes,
      owner: i.user.username
    }));
    return { statusCode: 200, body: JSON.stringify(formatted) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};