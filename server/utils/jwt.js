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

const getJwtExpiration = () => {
    switch (process.env.NODE_ENV) {
        case 'production':
            return process.env.JWT_EXPIRATION_PROD;
        case 'test':
            return process.env.JWT_EXPIRATION_TEST;
        default:
            return process.env.JWT_EXPIRATION_DEV;
    }
};

// Generate a token with userId and userRole
export const generateToken = (user) => {
    return jwt.sign(
        {
            _id: user._id,
            role: user.role
        },
        getJwtSecret(),
        { 
            expiresIn: getJwtExpiration() 
        }
    );
};

// Extract userId from the token
export const getUserId = (req) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    const verified = jwt.verify(token, getJwtSecret());
    console.log('Verified:', verified);
    return verified._id;
};

// Extract userRole from the token
export const getUserRole = (req) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    const verified = jwt.verify(token, getJwtSecret());
    console.log('Verified:', verified);
    return verified.role;
};
