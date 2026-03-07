const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  try {
    const { itemId } = JSON.parse(event.body);
    await prisma.vaultItem.update({
      where: { id: itemId },
      data: { likes: { increment: 1 } }
    });
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};