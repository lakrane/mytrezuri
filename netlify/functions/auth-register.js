const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, username, fullName, password, referralCode } = JSON.parse(event.body);

    // Validate username (letters, numbers, underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid username' }) };
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] }
    });
    if (existing) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email or username already taken' }) };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isFirstUser = (await prisma.user.count()) === 0;

    const user = await prisma.user.create({
      data: {
        email,
        username,
        fullName,
        password: hashedPassword,
        referralCode: username,
        referredBy: referralCode || null,
        role: isFirstUser ? 'admin' : 'user'
      }
    });

    // Handle referral points and notifications
    if (referralCode) {
      const referrer = await prisma.user.findUnique({ where: { referralCode } });
      if (referrer) {
        await prisma.user.update({
          where: { id: referrer.id },
          data: { points: { increment: 10 } }
        });
        await prisma.notification.create({
          data: {
            userId: referrer.id,
            type: 'referral',
            message: `${username} signed up using your link! You earned 10 points.`
          }
        });
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        user: { id: user.id, email: user.email, username: user.username, role: user.role }
      })
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};