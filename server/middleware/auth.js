// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

// Authenticate the token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    // Verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Extract the user id from the token
            

    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

export default authenticateToken;

// Check if the user is an admin
export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  next();
};

// Check if the user is a moderator