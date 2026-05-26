import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

  // Also set cookie for backward compatibility with local dev
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none', // 'none' required for cross-site
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Return token so frontend can store it in localStorage (cross-domain)
  return token;
};

export default generateToken;
