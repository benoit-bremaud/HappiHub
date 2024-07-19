import jwt from 'jsonwebtoken';

// Generate a token with userId and userRole
export const generateToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            role: user.role
        },
        process.env.JWT_SECRET,
        { 
            expiresIn: '1d' 
        }
    );
};

// Extract userId from the token
export const getUserId = (req) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    return verified._id;
};

// Extract userRole from the token
export const getUserRole = (req) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    return verified.role;
};
