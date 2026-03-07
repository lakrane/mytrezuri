const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  const token = event.headers.authorization?.split(' ')[1];
  if (!token) return { statusCode: 401, body: 'Unauthorized' };

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const data = JSON.parse(event.body);
    const item = await prisma.vaultItem.create({
      data: {
        userId: decoded.userId,
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
    return { statusCode: 200, body: JSON.stringify(item) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};