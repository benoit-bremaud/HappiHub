// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
    switch (process.env.NODE_ENV) {
        case 'production':
            return process.env.JWT_SECRET_PROD;
        case 'test':
            return process.env.JWT_SECRET_TEST;
        default:
            return process.env.JWT_SECRET_DEV; // Par défaut, environnement de développement
    }
};

// Authenticate the token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    // Verify the token
    const verified = jwt.verify(token, getJwtSecret());
                
    // Add the user to the request object
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

// Refresh the token