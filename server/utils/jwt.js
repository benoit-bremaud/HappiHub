import jwt from 'jsonwebtoken';

// Generate a token with userId and userRole
export const generateToken = (user, config) => {
    return jwt.sign(
        {
            _id: user._id,
            role: user.role
        },
        config.jwtSecret,
        {
            algorithm: 'HS256',
            expiresIn: config.jwtExpiration
        }
    );
};

/** Identity helpers only consume the subject verified by authentication middleware. */
export const getUserId = (req) => req.user?._id;
export const getUserRole = (req) => req.user?.role;
