import jwt from 'jsonwebtoken';

const generateToken = (user) => {
    return jwt.sign(
        {   _id: user._id,
            name: user.name,
            email: user.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '1d',
        }
    ); 
}

export default generateToken;