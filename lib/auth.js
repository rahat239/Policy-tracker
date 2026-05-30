const jwt = require('jsonwebtoken');
require('dotenv').config();

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || 
    req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

module.exports = authMiddleware;
