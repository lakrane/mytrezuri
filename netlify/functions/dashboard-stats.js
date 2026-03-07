const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const [vaultCount, taskCount, referralSignups, user, tasks, goals] = await Promise.all([
      prisma.vaultItem.count({ where: { userId } }),
      prisma.task.count({ where: { userId, completed: false } }),
      prisma.user.count({ where: { referredBy: (await prisma.user.findUnique({ where: { id: userId } })).referralCode } }),
      prisma.user.findUnique({ where: { id: userId }, select: { points: true } }),
      prisma.task.findMany({ where: { userId, completed: false }, take: 5, orderBy: { createdAt: 'desc' } }),
      prisma.goal.findMany({ where: { userId }, take: 3 })
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        vaultCount,
        taskCount,
        referralSignups,
        points: user.points,
        tasks,
        goals
      })
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};