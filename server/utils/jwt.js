import jwt from 'jsonwebtoken';

const generateToken = (userId) => {
    return jwt.sign(
        { _id: userId },
        process.env.JWT_SECRET,
        process.env.JWT_EXPIRE
    ); 
}

export default generateToken;