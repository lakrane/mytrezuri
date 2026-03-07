const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, ...data } = JSON.parse(event.body);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    const item = await prisma.vaultItem.findUnique({ where: { id } });
    if (!item) return { statusCode: 404, body: 'Not found' };
    if (item.userId !== decoded.userId && user.role !== 'admin') {
      return { statusCode: 403, body: 'Forbidden' };
    }
    const updated = await prisma.vaultItem.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        visibility: data.visibility,
        content: data.content,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileType: data.fileType,
        allowDownload: data.allowDownload,
        children: data.children ? JSON.stringify(data.children) : null
      }
    });
    return { statusCode: 200, body: JSON.stringify(updated) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};