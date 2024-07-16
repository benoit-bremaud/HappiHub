import jwt from 'jsonwebtoken';

// Generate token
const generateToken = (user) => {
    // Sign the token with the user id and secret key
    return jwt.sign(
        {   _id: user._id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1d',
        }
    ); 
}

export default generateToken;