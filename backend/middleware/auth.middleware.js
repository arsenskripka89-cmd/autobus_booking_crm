const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'secretkey';

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'Authorization header missing' });
  const token = header.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token missing' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    req.userId = decoded.id;
    return next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
module.exports.SECRET = SECRET;
